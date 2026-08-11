import { NodeType } from './ast.js';
import { SymbolTable } from './symbol.js';
import { ApproximateASTParser } from './parser.js';
import { SymbolPass } from './passes/symbol.js';
import { SurfacePass } from './passes/surface.js';
import { LexicalPass } from './passes/lexical.js';
import { StructuralPass } from './passes/structural.js';
import { FlowPass } from './passes/flow.js';

export const MIN_TEXT_LENGTH = 100;

export const DEFAULT_DOMAIN_BASELINES = {
  technical_doc: {
    domain: "technical_doc",
    bias_term: -0.35,
    correction_factor: 0.85,
    expected_structural_weight_modifier: 0.4,
    description: "仕様書・技術設計書。意図的な構造化を許容し偽陽性を抑止。"
  },
  technical: {
    domain: "technical",
    bias_term: -0.35,
    correction_factor: 0.85,
    expected_structural_weight_modifier: 0.4,
    description: "技術ドキュメント。"
  },
  spec: {
    domain: "spec",
    bias_term: -0.35,
    correction_factor: 0.85,
    expected_structural_weight_modifier: 0.4,
    description: "仕様書。"
  },
  academic_paper: {
    domain: "academic_paper",
    bias_term: -0.40,
    correction_factor: 0.90,
    expected_structural_weight_modifier: 0.3,
    description: "学術論文。文法の厳密性と受動態定型文を考慮。"
  },
  report: {
    domain: "report",
    bias_term: -0.15,
    correction_factor: 0.60,
    expected_structural_weight_modifier: 0.65,
    description: "業務・調査レポート。中程度の構造化を考慮。"
  },
  blog: {
    domain: "blog",
    bias_term: 0.0,
    correction_factor: 0.40,
    expected_structural_weight_modifier: 0.8,
    description: "技術・個人ブログ。一定の口語と個人の経験談を期待。"
  },
  essay: {
    domain: "essay",
    bias_term: 0.1,
    correction_factor: 0.20,
    expected_structural_weight_modifier: 1.0,
    description: "散文・雑記・エッセイ。ゆらぎの欠如を強力にペナルティ判定。"
  },
  general: {
    domain: "general",
    bias_term: 0.0,
    correction_factor: 0.50,
    expected_structural_weight_modifier: 0.8,
    description: "一般散文・汎用ドメイン。"
  }
};

export class TanukiContextChecker {
  constructor(passes = null, domainBaselines = null) {
    this.parser = new ApproximateASTParser();
    this.passes = passes || [
      new SymbolPass(),
      new SurfacePass(),
      new LexicalPass(),
      new StructuralPass(),
      new FlowPass()
    ];
    this.domainBaselines = domainBaselines || DEFAULT_DOMAIN_BASELINES;
  }

  analyzeText(text, domain = "general", docId = "doc_0") {
    const strippedText = (text || '').trim();
    const textLength = strippedText.length;

    if (textLength < MIN_TEXT_LENGTH) {
      return {
        doc_id: docId,
        overall_score: 0.0,
        classification: "HUMAN_FLUCTUATION_STRONG",
        confidence: "INSUFFICIENT_LENGTH",
        layer_scores: {},
        evidence_explanations: ["テキスト長が最小閾値（100文字）未満のため判定を自動スキップしました。"],
        domain_applied: domain
      };
    }

    let confidence = "HIGH";
    if (textLength < 150) {
      confidence = "LOW";
    } else if (textLength < 200) {
      confidence = "MEDIUM";
    }

    // 1. Parse AST & Symbol Table
    const ast = this.parser.parse(text, docId);
    const symTable = new SymbolTable();

    // 2. Execute analysis passes
    const layerResults = {};
    for (let i = 0; i < this.passes.length; i++) {
      const p = this.passes[i];
      layerResults[p.name] = p.execute(ast, symTable);
    }

    const surface = layerResults["SurfacePass"] || {};
    const lexical = layerResults["LexicalPass"] || {};
    const structural = layerResults["StructuralPass"] || {};
    const flow = layerResults["FlowPass"] || {};

    // 3. Layer Score Calculations
    // 3.1 Surface Score
    const hasCodeblockWrapper = /```[a-zA-Z]*/.test(text);
    const hasMetaClosing = /ご参考になりましたら幸いです|お気軽にお知らせください/.test(text);

    let surfaceScore =
      ((surface.markdown_anomaly_score || 0) * 40.0) +
      ((surface.punctuation_uniformity || 0) * 40.0) +
      Math.min((surface.em_dash_density || 0) * 20.0, 20.0);

    if (hasCodeblockWrapper) {
      surfaceScore = Math.max(surfaceScore, 90.0);
    } else if (hasMetaClosing) {
      surfaceScore = Math.max(surfaceScore, 85.0);
    }
    surfaceScore = Math.min(100.0, surfaceScore);

    // 3.2 Lexical Score
    let lexicalScore = Math.min(
      100.0,
      Math.min((lexical.ai_phrase_density || 0) * 12.0, 75.0) +
      ((lexical.hedge_expression_ratio || 0) * 40.0) +
      Math.max(0.0, (5.5 - (lexical.ngram_entropy || 0)) * 12.0)
    );
    if ((lexical.ai_phrase_density || 0) > 5.0) {
      lexicalScore = Math.min(100.0, lexicalScore + ((lexical.ai_phrase_density || 0) - 5.0) * 3.0);
    }

    // 3.3 Structural Score
    const pNodes = ast.get_nodes_by_type(NodeType.PARAGRAPH).filter(
      n => n.raw_text.trim() && !n.raw_text.trim().startsWith("---")
    );
    const pLengths = pNodes.map(n => n.raw_text.trim().length);
    let paragraphHomogeneity = 0.5;
    if (pLengths.length > 0) {
      const meanP = pLengths.reduce((a, b) => a + b, 0) / pLengths.length;
      const stdP = Math.sqrt(pLengths.reduce((acc, x) => acc + Math.pow(x - meanP, 2), 0) / pLengths.length);
      const pCv = meanP > 0 ? stdP / meanP : 0.0;
      paragraphHomogeneity = Math.max(0.0, 1.0 - pCv);
    }

    const listItemLengths = pNodes
      .filter(n => /^(?:[-*+・]|\d+\.)/.test(n.raw_text.replace(/^\s+/, '')))
      .map(n => n.raw_text.replace(/^\s*/, '').replace(/^[-*+123456789.・\s]+/, '').trim().length);

    let listItemHomogeneity = 0.5;
    if (listItemLengths.length >= 2) {
      const meanL = listItemLengths.reduce((a, b) => a + b, 0) / listItemLengths.length;
      const stdL = Math.sqrt(listItemLengths.reduce((acc, x) => acc + Math.pow(x - meanL, 2), 0) / listItemLengths.length);
      const listCv = meanL > 0 ? stdL / meanL : 0.0;
      listItemHomogeneity = Math.max(0.0, 1.0 - listCv);
    }

    const sentenceHomogeneity = Math.max(0.0, 1.0 - (structural.sentence_length_cv || 0));
    const depthHomogeneity = Math.max(0.0, Math.min(1.0, 1.0 - ((structural.depth_variance || 0) / 5.0)));

    const rawStructuralScore = Math.min(
      100.0,
      (sentenceHomogeneity * 25.0) +
      (paragraphHomogeneity * 25.0) +
      (listItemHomogeneity * 20.0) +
      (depthHomogeneity * 15.0) +
      Math.min((structural.heading_density || 0) * 3.0, 7.5) +
      Math.min((structural.list_density || 0) * 3.0, 7.5)
    );

    // 3.4 Flow Score
    const humanFlowSig = Math.min(
      100.0,
      ((flow.topic_jump_density || 0) * 20.0) +
      ((flow.self_correction_count || 0) * 35.0) +
      ((flow.emphasis_imbalance_entropy || 0) * 25.0) +
      ((flow.first_person_experience_density || 0) * 25.0) +
      (symTable.unresolved_references_count * 15.0)
    );
    const flowScore = Math.max(0.0, Math.min(100.0, 100.0 - humanFlowSig));

    const layerScores = {
      surface: Number(surfaceScore.toFixed(2)),
      lexical: Number(lexicalScore.toFixed(2)),
      structural: Number(rawStructuralScore.toFixed(2)),
      flow: Number(flowScore.toFixed(2))
    };

    // 4. Domain Compensation & Weighted Integration
    const dBaseline = this.domainBaselines[domain] || this.domainBaselines["general"] || DEFAULT_DOMAIN_BASELINES["general"];
    const structMod = dBaseline.expected_structural_weight_modifier;
    const biasTerm = dBaseline.bias_term;

    const wSurf = 0.15;
    const wLex = 0.35;
    const wStruct = 0.20 * structMod;
    const wFlow = 0.30;
    const wSum = wSurf + wLex + wStruct + wFlow;

    const biasMultiplier = biasTerm < -0.2 ? 18.0 : 10.0;
    const domainBiasPts = biasTerm * biasMultiplier;

    const rawOverall = (
      (surfaceScore * wSurf) +
      (lexicalScore * wLex) +
      (rawStructuralScore * wStruct) +
      (flowScore * wFlow)
    ) / wSum;

    const overallScore = Number(Math.max(0.0, Math.min(100.0, rawOverall + domainBiasPts)).toFixed(2));

    // 5. Classification
    let classification = "HUMAN_FLUCTUATION_STRONG";
    if (overallScore >= 70.0) {
      classification = "AI_HOMOGENEOUS_HIGH";
    } else if (overallScore >= 30.1) {
      classification = "MIXED_NEEDS_REVIEW";
    }

    // 6. Explanatory Evidence Generation
    const evidence = [];

    if (hasCodeblockWrapper) {
      evidence.push("コードブロック枠（```markdown）の消し忘れアーティファクトが検出されました");
    } else if ((surface.markdown_anomaly_score || 0) > 0.1) {
      evidence.push(`Markdownプロンプト残留/過剰強調が検出されました (異常スコア: ${(surface.markdown_anomaly_score || 0).toFixed(2)})`);
    }

    if ((lexical.ai_phrase_density || 0) > 2.0) {
      evidence.push(`AI頻出定型句の密度が高頻度です (密度: ${(lexical.ai_phrase_density || 0).toFixed(2)}/1000文字)`);
    }
    if ((lexical.hedge_expression_ratio || 0) > 0.3) {
      evidence.push(`責任回避・抽象ヘッジ表現が多用されています (比率: ${(lexical.hedge_expression_ratio || 0).toFixed(2)})`);
    }

    if ((structural.sentence_length_cv || 0) < 0.20) {
      evidence.push(`文長の均一性が極めて高く、人間特有の長短ゆらぎが乏しいです (CV: ${(structural.sentence_length_cv || 0).toFixed(2)})`);
    }
    if (paragraphHomogeneity > 0.7) {
      evidence.push(`段落長および構造の分散が著しく低下しており、整然と均一化されています (均一性: ${paragraphHomogeneity.toFixed(2)})`);
    }
    if (listItemLengths.length >= 2 && listItemHomogeneity > 0.7) {
      evidence.push("箇条書き項目の文字数が極めて均一に設計されています");
    }

    if ((flow.self_correction_count || 0) > 0) {
      evidence.push(`人間特有の思考の自己訂正・軌道修正の痕跡が検出されました (${flow.self_correction_count}件)`);
    }
    if ((flow.topic_jump_density || 0) > 1.0) {
      evidence.push(`話題の脱線・思考のジャンプが検出されました (密度: ${(flow.topic_jump_density || 0).toFixed(2)}/1000文字)`);
    }
    if ((flow.first_person_experience_density || 0) > 1.0) {
      evidence.push(`一人称および具体体験表現が含まれています (密度: ${(flow.first_person_experience_density || 0).toFixed(2)}/1000文字)`);
    }
    if (symTable.unresolved_references_count > 0) {
      evidence.push(`人間文章特有の暗黙的・未解決参照が検出されました (${symTable.unresolved_references_count}件)`);
    }

    if (flowScore >= 70.0 && (flow.self_correction_count || 0) === 0 && (flow.first_person_experience_density || 0) === 0.0) {
      evidence.push("脱線・自己訂正・一人称体験が欠如しており、AI特有の均質で機械的な文章フローです");
    }

    if (["technical_doc", "technical", "spec", "academic_paper", "report"].includes(domain)) {
      evidence.push(`ドメイン補正 (${domain}) を適用し、仕様書・報告書等の構造化に伴うスコアを最適補正しました`);
    }

    if (evidence.length === 0) {
      evidence.push("特記すべきAI均質シグナルは検出されませんでした。");
    }

    return {
      doc_id: docId,
      overall_score: overallScore,
      classification: classification,
      confidence: confidence,
      layer_scores: layerScores,
      evidence_explanations: evidence,
      domain_applied: domain
    };
  }
}
