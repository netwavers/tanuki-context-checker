import math
import re
from typing import Dict, List, Optional
from tanuki_checker.ast import DocumentAST, NodeType
from tanuki_checker.symbol import SymbolTable
from tanuki_checker.parser import ApproximateASTParser
from tanuki_checker.passes.base import IAnalysisPass, PassExecutionError
from tanuki_checker.passes.symbol import SymbolPass
from tanuki_checker.passes.flow import FlowPass
from tanuki_checker.passes.surface import SurfacePass
from tanuki_checker.passes.lexical import LexicalPass
from tanuki_checker.passes.structural import StructuralPass
from tanuki_checker.metrics import (
    FinalAssessmentReport,
    ConfidenceFlag,
    SurfaceMetrics,
    LexicalMetrics,
    StructuralMetrics,
    FlowMetrics,
    DomainBaseline,
    ProofreadingDirective,
    LLMPromptTemplate,
    AIProofreadPayload,
)

MIN_TEXT_LENGTH = 100

DEFAULT_DOMAIN_BASELINES: Dict[str, DomainBaseline] = {
    "technical_doc": DomainBaseline(
        domain="technical_doc",
        bias_term=-0.35,
        correction_factor=0.85,
        expected_structural_weight_modifier=0.4,
        description="仕様書・技術設計書。意図的な構造化を許容し偽陽性を抑止。",
    ),
    "technical": DomainBaseline(
        domain="technical",
        bias_term=-0.35,
        correction_factor=0.85,
        expected_structural_weight_modifier=0.4,
        description="技術ドキュメント。",
    ),
    "spec": DomainBaseline(
        domain="spec",
        bias_term=-0.35,
        correction_factor=0.85,
        expected_structural_weight_modifier=0.4,
        description="仕様書。",
    ),
    "academic_paper": DomainBaseline(
        domain="academic_paper",
        bias_term=-0.40,
        correction_factor=0.90,
        expected_structural_weight_modifier=0.3,
        description="学術論文。文法の厳密性と受動態定型文を考慮。",
    ),
    "report": DomainBaseline(
        domain="report",
        bias_term=-0.15,
        correction_factor=0.60,
        expected_structural_weight_modifier=0.65,
        description="業務・調査レポート。中程度の構造化を考慮。",
    ),
    "blog": DomainBaseline(
        domain="blog",
        bias_term=0.0,
        correction_factor=0.40,
        expected_structural_weight_modifier=0.8,
        description="技術・個人ブログ。一定の口語と個人の経験談を期待。",
    ),
    "essay": DomainBaseline(
        domain="essay",
        bias_term=0.1,
        correction_factor=0.20,
        expected_structural_weight_modifier=1.0,
        description="散文・雑記・エッセイ。ゆらぎの欠如を強力にペナルティ判定。",
    ),
    "novel": DomainBaseline(
        domain="novel",
        bias_term=-0.10,
        correction_factor=0.60,
        expected_structural_weight_modifier=0.7,
        description="小説・文芸テキスト（参考値）。会話文・台詞主体の展開による変動を考慮。",
    ),
    "general": DomainBaseline(
        domain="general",
        bias_term=0.0,
        correction_factor=0.50,
        expected_structural_weight_modifier=0.8,
        description="一般散文・汎用ドメイン。",
    ),
}


class TanukiContextChecker:
    """
    Main Analysis Controller for Tanuki Context Checker.
    Executes AST construction, SymbolTable construction, and analysis pipeline passes.
    Integrates multi-layer scores with domain compensation, explanation generation, and confidence processing.
    """

    def __init__(
        self,
        passes: Optional[List[IAnalysisPass]] = None,
        domain_baselines: Optional[Dict[str, DomainBaseline]] = None,
    ):
        self.parser = ApproximateASTParser()
        self.passes: List[IAnalysisPass] = passes or [
            SymbolPass(),
            SurfacePass(),
            LexicalPass(),
            StructuralPass(),
            FlowPass(),
        ]
        self.domain_baselines: Dict[str, DomainBaseline] = (
            domain_baselines or DEFAULT_DOMAIN_BASELINES
        )

    def analyze_text(self, text: str, domain: str = "general", doc_id: str = "doc_0") -> FinalAssessmentReport:
        stripped_text = text.strip()
        text_length = len(stripped_text)

        # Confidence Flag & Insufficient Length Gate
        if text_length < MIN_TEXT_LENGTH:
            return FinalAssessmentReport(
                doc_id=doc_id,
                overall_score=0.0,
                classification="HUMAN_FLUCTUATION_STRONG",
                confidence=ConfidenceFlag.INSUFFICIENT_LENGTH,
                layer_scores={},
                evidence_explanations=["テキスト長が最小閾値（100文字）未満のため判定を自動スキップしました。"],
                domain_applied=domain,
            )

        if text_length < 150:
            confidence = ConfidenceFlag.LOW
        elif text_length < 200:
            confidence = ConfidenceFlag.MEDIUM
        else:
            confidence = ConfidenceFlag.HIGH

        # 1. Parse AST (Contiguous Arena Vector) & Symbol Table
        ast = self.parser.parse(text, doc_id=doc_id)
        sym_table = SymbolTable()

        # 2. Execute analysis passes
        layer_results: Dict[str, Dict[str, float]] = {}
        for p in self.passes:
            layer_results[p.name] = p.execute(ast, sym_table)

        # Extract layer metrics
        surface = SurfaceMetrics(**layer_results.get("SurfacePass", {}))
        lexical = LexicalMetrics(**layer_results.get("LexicalPass", {}))
        structural = StructuralMetrics(**layer_results.get("StructuralPass", {}))
        flow = FlowMetrics(**layer_results.get("FlowPass", {}))

        # 3. Layer Score Calculations
        # 3.1 Surface Score
        has_codeblock_wrapper = bool(re.search(r"```[a-zA-Z]*", text))
        has_meta_closing = bool(
            re.search(r"ご参考になりましたら幸いです|お気軽にお知らせください", text)
        )

        surface_score = (
            (surface.markdown_anomaly_score * 40.0)
            + (surface.punctuation_uniformity * 40.0)
            + min(surface.em_dash_density * 20.0, 20.0)
        )
        if has_codeblock_wrapper:
            surface_score = max(surface_score, 90.0)
        elif has_meta_closing:
            surface_score = max(surface_score, 85.0)
        surface_score = min(100.0, surface_score)

        # 3.2 Lexical Score
        lexical_score = min(
            100.0,
            min(lexical.ai_phrase_density * 12.0, 75.0)
            + (lexical.hedge_expression_ratio * 40.0)
            + max(0.0, (5.5 - lexical.ngram_entropy) * 12.0),
        )
        if lexical.ai_phrase_density > 5.0:
            lexical_score = min(100.0, lexical_score + (lexical.ai_phrase_density - 5.0) * 3.0)

        # 3.3 Structural Score
        p_nodes = [
            n for n in ast.get_nodes_by_type(NodeType.PARAGRAPH)
            if n.raw_text.strip() and not n.raw_text.strip().startswith("---")
        ]
        p_lengths = [len(n.raw_text.strip()) for n in p_nodes]
        if p_lengths:
            mean_p = sum(p_lengths) / len(p_lengths)
            std_p = math.sqrt(sum((x - mean_p) ** 2 for x in p_lengths) / len(p_lengths))
            p_cv = std_p / mean_p if mean_p > 0 else 0.0
            paragraph_homogeneity = max(0.0, 1.0 - p_cv)
        else:
            paragraph_homogeneity = 0.5

        list_item_lengths = [
            len(n.raw_text.lstrip("-*+123456789.・ ").strip())
            for n in p_nodes
            if n.raw_text.lstrip().startswith(("- ", "* ", "+ ", "1.", "2.", "3.", "4.", "5.", "・"))
        ]
        if len(list_item_lengths) >= 2:
            mean_l = sum(list_item_lengths) / len(list_item_lengths)
            std_l = math.sqrt(sum((x - mean_l) ** 2 for x in list_item_lengths) / len(list_item_lengths))
            list_cv = std_l / mean_l if mean_l > 0 else 0.0
            list_item_homogeneity = max(0.0, 1.0 - list_cv)
        else:
            list_item_homogeneity = 0.5

        sentence_homogeneity = max(0.0, 1.0 - structural.sentence_length_cv)
        depth_homogeneity = max(0.0, min(1.0, 1.0 - (structural.depth_variance / 5.0)))

        raw_structural_score = min(
            100.0,
            (sentence_homogeneity * 25.0)
            + (paragraph_homogeneity * 25.0)
            + (list_item_homogeneity * 20.0)
            + (depth_homogeneity * 15.0)
            + min(structural.heading_density * 3.0, 7.5)
            + min(structural.list_density * 3.0, 7.5),
        )

        # 3.4 Flow Score
        human_flow_sig = min(
            100.0,
            (flow.topic_jump_density * 20.0)
            + (flow.self_correction_count * 35.0)
            + (flow.emphasis_imbalance_entropy * 25.0)
            + (flow.first_person_experience_density * 25.0)
            + (sym_table.unresolved_references_count * 15.0),
        )
        flow_score = max(0.0, min(100.0, 100.0 - human_flow_sig))

        layer_scores = {
            "surface": round(surface_score, 2),
            "lexical": round(lexical_score, 2),
            "structural": round(raw_structural_score, 2),
            "flow": round(flow_score, 2),
        }

        # 4. Domain Compensation & Weighted Integration
        d_baseline = self.domain_baselines.get(domain, self.domain_baselines.get("general", DEFAULT_DOMAIN_BASELINES["general"]))
        struct_mod = d_baseline.expected_structural_weight_modifier
        bias_term = d_baseline.bias_term

        w_surf = 0.15
        w_lex = 0.35
        w_struct = 0.20 * struct_mod
        w_flow = 0.30
        w_sum = w_surf + w_lex + w_struct + w_flow

        bias_multiplier = 18.0 if bias_term < -0.2 else 10.0
        domain_bias_pts = bias_term * bias_multiplier

        raw_overall = (
            (surface_score * w_surf)
            + (lexical_score * w_lex)
            + (raw_structural_score * w_struct)
            + (flow_score * w_flow)
        ) / w_sum

        overall_score = round(max(0.0, min(100.0, raw_overall + domain_bias_pts)), 2)

        # 5. Classification
        if overall_score >= 70.0:
            classification = "AI_HOMOGENEOUS_HIGH"
        elif overall_score >= 30.1:
            classification = "MIXED_NEEDS_REVIEW"
        else:
            classification = "HUMAN_FLUCTUATION_STRONG"

        # 6. Explanatory Evidence Generation
        evidence: List[str] = []

        if has_codeblock_wrapper:
            evidence.append("コードブロック枠（```markdown）の消し忘れアーティファクトが検出されました")
        elif surface.markdown_anomaly_score > 0.1:
            evidence.append(f"Markdownプロンプト残留/過剰強調が検出されました (異常スコア: {surface.markdown_anomaly_score:.2f})")

        if lexical.ai_phrase_density > 2.0:
            evidence.append(f"AI頻出定型句の密度が高頻度です (密度: {lexical.ai_phrase_density:.2f}/1000文字)")
        if lexical.hedge_expression_ratio > 0.3:
            evidence.append(f"責任回避・抽象ヘッジ表現が多用されています (比率: {lexical.hedge_expression_ratio:.2f})")

        if structural.sentence_length_cv < 0.20:
            evidence.append(f"文長の均一性が極めて高く、人間特有の長短ゆらぎが乏しいです (CV: {structural.sentence_length_cv:.2f})")
        if paragraph_homogeneity > 0.7:
            evidence.append(f"段落長および構造の分散が著しく低下しており、整然と均一化されています (均一性: {paragraph_homogeneity:.2f})")
        if len(list_item_lengths) >= 2 and list_item_homogeneity > 0.7:
            evidence.append("箇条書き項目の文字数が極めて均一に設計されています")

        if flow.self_correction_count > 0:
            evidence.append(f"人間特有の思考の自己訂正・軌道修正の痕跡が検出されました ({flow.self_correction_count}件)")
        if flow.topic_jump_density > 1.0:
            evidence.append(f"話題の脱線・思考のジャンプが検出されました (密度: {flow.topic_jump_density:.2f}/1000文字)")
        if flow.first_person_experience_density > 1.0:
            evidence.append(f"一人称および具体体験表現が含まれています (密度: {flow.first_person_experience_density:.2f}/1000文字)")
        if sym_table.unresolved_references_count > 0:
            evidence.append(f"人間文章特有の暗黙的・未解決参照が検出されました ({sym_table.unresolved_references_count}件)")

        if flow_score >= 70.0 and flow.self_correction_count == 0 and flow.first_person_experience_density == 0.0:
            evidence.append("脱線・自己訂正・一人称体験が欠如しており、AI特有の均質で機械的な文章フローです")

        if domain in ["technical_doc", "technical", "spec", "academic_paper", "report"]:
            evidence.append(f"ドメイン補正 ({domain}) を適用し、仕様書・報告書等の構造化に伴うスコアを最適補正しました")

        if not evidence:
            evidence.append("特記すべきAI均質シグナルは検出されませんでした。")

        return FinalAssessmentReport(
            doc_id=doc_id,
            overall_score=overall_score,
            classification=classification,
            confidence=confidence,
            layer_scores=layer_scores,
            evidence_explanations=evidence,
            domain_applied=domain,
        )

    def generate_proofread_payload(self, text: str, domain: str = "general", doc_id: str = "doc_0") -> AIProofreadPayload:
        report = self.analyze_text(text, domain=domain, doc_id=doc_id)

        ast = self.parser.parse(text, doc_id=doc_id)
        sym_table = SymbolTable()
        layer_results: Dict[str, Dict[str, float]] = {}
        for p in self.passes:
            layer_results[p.name] = p.execute(ast, sym_table)

        surface = SurfaceMetrics(**layer_results.get("SurfacePass", {}))
        lexical = LexicalMetrics(**layer_results.get("LexicalPass", {}))
        structural = StructuralMetrics(**layer_results.get("StructuralPass", {}))
        flow = FlowMetrics(**layer_results.get("FlowPass", {}))

        has_codeblock_wrapper = bool(re.search(r"```[a-zA-Z]*", text))
        has_meta_closing = bool(
            re.search(r"ご参考になりましたら幸いです|お気軽にお知らせください", text)
        )

        diagnostics = {
            "surface": {
                "markdown_anomaly_score": round(surface.markdown_anomaly_score, 4),
                "punctuation_uniformity": round(surface.punctuation_uniformity, 4),
                "em_dash_density": round(surface.em_dash_density, 4),
                "has_codeblock_wrapper": 1.0 if has_codeblock_wrapper else 0.0,
                "has_meta_closing": 1.0 if has_meta_closing else 0.0,
            },
            "lexical": {
                "ai_phrase_density": round(lexical.ai_phrase_density, 4),
                "ngram_entropy": round(lexical.ngram_entropy, 4),
                "hedge_expression_ratio": round(lexical.hedge_expression_ratio, 4),
            },
            "structural": {
                "depth_variance": round(structural.depth_variance, 4),
                "sentence_length_cv": round(structural.sentence_length_cv, 4),
                "heading_density": round(structural.heading_density, 4),
                "list_density": round(structural.list_density, 4),
            },
            "flow": {
                "topic_jump_density": round(flow.topic_jump_density, 4),
                "self_correction_count": float(flow.self_correction_count),
                "emphasis_imbalance_entropy": round(flow.emphasis_imbalance_entropy, 4),
                "first_person_experience_density": round(flow.first_person_experience_density, 4),
                "unresolved_references_count": float(sym_table.unresolved_references_count),
            },
        }

        directives: List[ProofreadingDirective] = []

        if has_codeblock_wrapper or surface.markdown_anomaly_score > 0.1:
            directives.append(
                ProofreadingDirective(
                    layer="surface",
                    priority="HIGH",
                    issue="コードブロック枠（```markdown）やプロンプト残留マークが検出されました",
                    action="不要なコードブロック枠（```markdown等）を取り除き、テキスト本文のみを出力してください。",
                )
            )
        if has_meta_closing:
            directives.append(
                ProofreadingDirective(
                    layer="surface",
                    priority="HIGH",
                    issue="AI特有の無用な締めくくり挨拶（'ご参考になれば幸いです'等）が含まれています",
                    action="文末のテンプレート挨拶を削除し、本文として自然に締めくくってください。",
                )
            )

        if lexical.ai_phrase_density > 2.0:
            directives.append(
                ProofreadingDirective(
                    layer="lexical",
                    priority="HIGH",
                    issue=f"AI特有の頻出定型句の密度が高頻度です ({lexical.ai_phrase_density:.2f}/1000文字)",
                    action="『〜において重要です』『結論として』『〜が挙げられます』などのAI定型句を避け、文脈に応じた具象的な語彙に書き換えてください。",
                )
            )
        if lexical.hedge_expression_ratio > 0.25:
            directives.append(
                ProofreadingDirective(
                    layer="lexical",
                    priority="MEDIUM",
                    issue=f"責任回避・抽象ヘッジ表現が多用されています (比率: {lexical.hedge_expression_ratio:.2f})",
                    action="『〜と考えられる』『〜と言えるでしょう』といった曖昧な語尾を減らし、主張や事実関係を明確に言い切るか具体例を補強してください。",
                )
            )
        if lexical.ngram_entropy < 4.5 and len(text) > 150:
            directives.append(
                ProofreadingDirective(
                    layer="lexical",
                    priority="LOW",
                    issue=f"語彙バリエーションの多様性が低下しています (エントロピー: {lexical.ngram_entropy:.2f})",
                    action="同一単語の連続使用を避け、類語やバリエーションのある表現を採用してください。",
                )
            )

        if structural.sentence_length_cv < 0.25:
            directives.append(
                ProofreadingDirective(
                    layer="structural",
                    priority="HIGH",
                    issue=f"文長の均一性が高く、文のリズムに人間の試行錯誤的なゆらぎが乏しいです (CV: {structural.sentence_length_cv:.2f})",
                    action="一言で言い切る短い文と、条件や根拠を重ねる複文を意図的に混ぜ合わせ、文章の緩急（リズム）を作り出してください。",
                )
            )

        if flow.self_correction_count == 0 and report.layer_scores.get("flow", 0.0) >= 50.0:
            directives.append(
                ProofreadingDirective(
                    layer="flow",
                    priority="HIGH",
                    issue="軌道修正・自己訂正（'ただし...' '実際には...'）や具体的な個人的視点が欠如しています",
                    action="『ただし実際には〜という側面もあります』『一見〜に思えますが〜』のように、思考の揺れや補足を適度に変調として差し込んでください。",
                )
            )
        if flow.first_person_experience_density == 0.0 and report.layer_scores.get("flow", 0.0) >= 50.0:
            directives.append(
                ProofreadingDirective(
                    layer="flow",
                    priority="MEDIUM",
                    issue="無人格的で一律な解説トーンになっており、筆者の文脈・立ち位置が見えにくいです",
                    action="筆者の観察視点や判断理由、現場での実際のニュアンスを補い、血の通った文章に校正してください。",
                )
            )

        if not directives:
            directives.append(
                ProofreadingDirective(
                    layer="general",
                    priority="LOW",
                    issue="強固なAI均質シグナルは検出されませんでした",
                    action="全体的な誤字脱字・てにをはのチェックを行い、文章の推敲を維持してください。",
                )
            )

        system_prompt = (
            "あなたは文章の「AI臭さ（過剰な均質化・定型句・ゆらぎの欠如）」を解消し、"
            "人間が筆を執ったような自然で味わいのある文章に校正・リライティングするプロのエディターです。"
        )

        formatted_directives = "\n".join(
            [
                f"{idx+1}. [{d.layer.upper()}] ({d.priority}) {d.action} (問題: {d.issue})"
                for idx, d in enumerate(directives)
            ]
        )

        user_prompt = (
            f"以下の【対象テキスト】を、【判定レポート】および【AI校正指示】に従って自然で人間らしい文章にAI校正（リライティング）してください。\n\n"
            f"【判定概要】:\n"
            f"・適用ドメイン: {domain}\n"
            f"・総合AIスコア: {report.overall_score:.1f} / 100.0 (判定: {report.classification})\n"
            f"・層別スコア: 表層={report.layer_scores.get('surface',0):.1f}, 語彙={report.layer_scores.get('lexical',0):.1f}, 構造={report.layer_scores.get('structural',0):.1f}, フロー={report.layer_scores.get('flow',0):.1f}\n\n"
            f"【AI校正指示 (Directives)】:\n{formatted_directives}\n\n"
            f"【対象テキスト】:\n{text.strip()}\n\n"
            f"【出力要件】:\n"
            f"・元の文章の重要情報や要点は損なわず維持してください。\n"
            f"・上記の指示を反映し、AI特有の無機質さを取り除いた「校正後の文章のみ」を出力してください。"
        )

        return AIProofreadPayload(
            doc_id=doc_id,
            overall_score=report.overall_score,
            classification=report.classification,
            confidence=report.confidence,
            domain_applied=domain,
            layer_scores=report.layer_scores,
            diagnostics=diagnostics,
            proofreading_directives=directives,
            llm_prompt_template=LLMPromptTemplate(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
            ),
        )

