from typing import Dict, List, Optional
from enum import Enum
from pydantic import BaseModel, Field


class ConfidenceFlag(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INSUFFICIENT_LENGTH = "INSUFFICIENT_LENGTH"


class SurfaceMetrics(BaseModel):
    markdown_anomaly_score: float = 0.0  # 消し忘れMarkdownの密度
    punctuation_uniformity: float = 0.0  # 記号出現の均一性
    em_dash_density: float = 0.0         # emダッシュ密度


class LexicalMetrics(BaseModel):
    ai_phrase_density: float = 0.0        # AI頻出定型句密度
    ngram_entropy: float = 0.0            # 語彙バリエーションのエントロピー
    hedge_expression_ratio: float = 0.0  # 責任回避・抽象ヘッジ表現率


class StructuralMetrics(BaseModel):
    depth_variance: float = 0.0          # AST深さの分散
    sentence_length_cv: float = 0.0      # 文長の変動係数 (StdDev / Mean)
    paragraph_length_cv: float = 0.0     # 段落長の変動係数
    node_type_entropy: float = 0.0       # 構文構成要素のエントロピー
    heading_density: float = 0.0         # 見出し密度
    list_density: float = 0.0            # リスト密度


class FlowMetrics(BaseModel):
    topic_jump_density: float = 0.0      # 話題の脱線・ジャンプ発生率
    self_correction_count: int = 0       # 軌道修正・言い換えの痕跡数
    emphasis_imbalance_entropy: float = 0.0 # 主張と根拠の力点の不均一性
    first_person_experience_density: float = 0.0 # 一人称・具体経験表現の密度


class DomainBaseline(BaseModel):
    domain: str
    bias_term: float = 0.0
    correction_factor: float = 1.0
    expected_structural_weight_modifier: float = 1.0
    description: str = ""


class FinalAssessmentReport(BaseModel):
    doc_id: str
    overall_score: float  # 0.0 - 100.0 (高いほどAI生成の可能性高)
    classification: str   # "HUMAN_FLUCTUATION_STRONG" | "MIXED_NEEDS_REVIEW" | "AI_HOMOGENEOUS_HIGH"
    confidence: ConfidenceFlag
    layer_scores: Dict[str, float] = Field(default_factory=dict)  # surface, lexical, structural, flow
    evidence_explanations: List[str] = Field(default_factory=list)
    domain_applied: str = "general"


class ProofreadingDirective(BaseModel):
    layer: str        # "surface", "lexical", "structural", "flow"
    priority: str     # "HIGH", "MEDIUM", "LOW"
    issue: str        # 検出された問題・シグナル
    action: str       # LLM校正時に適用すべき具体アクション


class LLMPromptTemplate(BaseModel):
    system_prompt: str
    user_prompt: str


class AIProofreadPayload(BaseModel):
    doc_id: str
    overall_score: float
    classification: str
    confidence: ConfidenceFlag
    domain_applied: str
    layer_scores: Dict[str, float] = Field(default_factory=dict)
    diagnostics: Dict[str, Dict[str, float]] = Field(default_factory=dict)
    proofreading_directives: List[ProofreadingDirective] = Field(default_factory=list)
    llm_prompt_template: LLMPromptTemplate


