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
