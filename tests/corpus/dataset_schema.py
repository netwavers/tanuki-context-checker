"""
Evaluation Corpus Dataset Schema Definition for Tanuki Context Checker.
Strictly typed with Pydantic v2 to ensure dataset integrity, protocol consistency,
and alignment with docs/ARCHITECTURE_SPEC.md.
"""

from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class DomainType(str, Enum):
    TECHNICAL_DOC = "technical_doc"
    ESSAY = "essay"
    BLOG = "blog"
    REPORT = "report"
    ACADEMIC_PAPER = "academic_paper"


class AuthorType(str, Enum):
    HUMAN = "human"
    AI_GPT4O = "ai_gpt4o"
    AI_CLAUDE35 = "ai_claude35"
    AI_GEMINI15 = "ai_gemini15"
    AI_PROMPT_ENGINEERED = "ai_prompt_engineered"
    HUMAN_AI_HYBRID = "human_ai_hybrid"


class ClassificationLabel(str, Enum):
    HUMAN_FLUCTUATION_STRONG = "HUMAN_FLUCTUATION_STRONG"
    MIXED_NEEDS_REVIEW = "MIXED_NEEDS_REVIEW"
    AI_HOMOGENEOUS_HIGH = "AI_HOMOGENEOUS_HIGH"


class ExpectedScoreBand(BaseModel):
    min_score: float = Field(..., ge=0.0, le=100.0, description="Minimum expected overall AI probability score")
    max_score: float = Field(..., ge=0.0, le=100.0, description="Maximum expected overall AI probability score")
    target_classification: ClassificationLabel = Field(..., description="Target classification category")

    @field_validator("max_score")
    @classmethod
    def validate_score_range(cls, v: float, info) -> float:
        if "min_score" in info.data and v < info.data["min_score"]:
            raise ValueError("max_score must be greater than or equal to min_score")
        return v


class ExpectedLayerScores(BaseModel):
    surface: float = Field(..., ge=0.0, le=1.0, description="Expected surface anomaly score (0: human, 1: AI artifact)")
    lexical: float = Field(..., ge=0.0, le=1.0, description="Expected lexical homogeneity score (0: varied, 1: AI cliché/hedge)")
    structural: float = Field(..., ge=0.0, le=1.0, description="Expected structural uniformity score (0: high variance, 1: uniform depth/length)")
    flow: float = Field(..., ge=0.0, le=1.0, description="Expected flow fluctuation lack score (0: rich fluctuation/jumps, 1: rigid flow/no first-person)")


class QualitativeFeatures(BaseModel):
    has_first_person: bool = Field(default=False, description="Contains first-person narrative/experience")
    has_self_correction: bool = Field(default=False, description="Contains explicit self-correction or mid-thought adjustment")
    has_topic_jump: bool = Field(default=False, description="Contains abrupt topic transition or tangent")
    has_markdown_artifact: bool = Field(default=False, description="Contains leftover AI markdown formatting artifacts")
    has_ai_phrases: bool = Field(default=False, description="Contains AI cliché phrases (e.g. まとめ, 徹底解説)")
    unresolved_references_count: int = Field(default=0, ge=0, description="Number of contextually implicit/unresolved references")


class CorpusSample(BaseModel):
    sample_id: str = Field(..., description="Unique sample identifier (e.g. SAMPLE-HUMAN-001)")
    title: str = Field(..., description="Descriptive title of the text sample")
    text: str = Field(..., description="Full text content for evaluation")
    domain: DomainType = Field(..., description="Target domain classification")
    author_type: AuthorType = Field(..., description="Authoring origin category")
    prompt_type: Optional[str] = Field(default=None, description="Prompt strategy used if author is AI")
    char_count: int = Field(..., ge=0, description="Character count of raw text")
    expected_score_band: ExpectedScoreBand = Field(..., description="Ground truth score band range")
    expected_layer_scores: ExpectedLayerScores = Field(..., description="Ground truth layer score expectations")
    qualitative_features: QualitativeFeatures = Field(..., description="Annotated qualitative markers")
    evidence_notes: List[str] = Field(default_factory=list, description="Ground truth rationale and evidence descriptions")

    @field_validator("char_count")
    @classmethod
    def validate_char_count(cls, v: int, info) -> int:
        if "text" in info.data and len(info.data["text"]) != v:
            raise ValueError(f"char_count ({v}) does not match len(text) ({len(info.data['text'])})")
        return v


class DomainBaselineConfig(BaseModel):
    domain: DomainType
    bias_term: float = Field(..., description="Domain bias term b_D")
    correction_factor: float = Field(..., description="Domain correction factor k_D")
    expected_structural_weight_modifier: float = Field(..., ge=0.0, le=1.0, description="Weight reduction factor for structural score")
    description: str


class CorpusDataset(BaseModel):
    version: str = Field(default="1.0.0", description="Corpus dataset schema version")
    created_at: str = Field(..., description="ISO 8601 creation timestamp")
    description: str = Field(..., description="Corpus overview and purpose")
    domain_baselines: Dict[str, DomainBaselineConfig] = Field(..., description="Domain baseline parameters")
    samples: List[CorpusSample] = Field(..., description="List of annotated evaluation samples")
