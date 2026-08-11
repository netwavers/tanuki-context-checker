import re
import math
from typing import Dict
from tanuki_checker.ast import DocumentAST, NodeType, TokenTag
from tanuki_checker.symbol import SymbolTable
from tanuki_checker.passes.base import IAnalysisPass, PassExecutionError
from tanuki_checker.metrics import SurfaceMetrics


class SurfacePass(IAnalysisPass):
    def __init__(self):
        self._markdown_re = re.compile(r"```[a-zA-Z]*|\*\*.*?\*\*|^---+$|###?\s", re.MULTILINE)
        self._em_dash_re = re.compile(r"―|—|--")
        self._punc_re = re.compile(r"[。！？.!?]")

    @property
    def name(self) -> str:
        return "SurfacePass"

    def execute(self, ast: DocumentAST, sym_table: SymbolTable) -> Dict[str, float]:
        try:
            metrics = self.analyze(ast, sym_table)
            return metrics.model_dump()
        except Exception as e:
            raise PassExecutionError(f"Error in SurfacePass: {str(e)}") from e

    def analyze(self, ast: DocumentAST, sym_table: SymbolTable) -> SurfaceMetrics:
        doc_node = ast.get_node(ast.root_id)
        if not doc_node or not doc_node.raw_text:
            return SurfaceMetrics()

        text = doc_node.raw_text
        text_len = max(len(text), 1)

        # 1. Markdown Anomaly Score
        # Look for ```markdown, **bold**, ---, # headers inside body text, prompt artifact indicators
        markdown_matches = self._markdown_re.findall(text)
        md_char_count = sum(len(m) for m in markdown_matches)
        # Normalized score per 1000 chars, capped at 1.0
        markdown_anomaly_score = min((md_char_count / text_len) * 20.0, 1.0)

        # 2. Em-Dash Density
        em_dashes = self._em_dash_re.findall(text)
        em_dash_density = (len(em_dashes) / text_len) * 1000.0  # per 1000 chars

        # 3. Punctuation Uniformity
        # Calculate standard deviation of character distance between punctuation marks (。!?.!?)
        punc_positions = [m.start() for m in self._punc_re.finditer(text)]
        if len(punc_positions) >= 3:
            gaps = [
                punc_positions[i] - punc_positions[i - 1]
                for i in range(1, len(punc_positions))
            ]
            mean_gap = sum(gaps) / len(gaps)
            variance = sum((g - mean_gap) ** 2 for g in gaps) / len(gaps)
            std_gap = math.sqrt(variance)
            cv_gap = std_gap / mean_gap if mean_gap > 0 else 0.0
            # Higher punctuation uniformity -> lower gap variance (CV close to 0) -> uniformity score high
            punctuation_uniformity = max(0.0, min(1.0, 1.0 - cv_gap))
        else:
            punctuation_uniformity = 0.5

        return SurfaceMetrics(
            markdown_anomaly_score=round(markdown_anomaly_score, 4),
            punctuation_uniformity=round(punctuation_uniformity, 4),
            em_dash_density=round(em_dash_density, 4),
        )
