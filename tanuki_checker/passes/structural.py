import math
from typing import Dict, List
from tanuki_checker.ast import DocumentAST, NodeType
from tanuki_checker.symbol import SymbolTable
from tanuki_checker.passes.base import IAnalysisPass, PassExecutionError
from tanuki_checker.metrics import StructuralMetrics


class StructuralPass(IAnalysisPass):
    @property
    def name(self) -> str:
        return "StructuralPass"

    def execute(self, ast: DocumentAST, sym_table: SymbolTable) -> Dict[str, float]:
        try:
            metrics = self.analyze(ast, sym_table)
            return metrics.model_dump()
        except Exception as e:
            raise PassExecutionError(f"Error in StructuralPass: {str(e)}") from e

    def analyze(self, ast: DocumentAST, sym_table: SymbolTable) -> StructuralMetrics:
        if not ast.nodes:
            return StructuralMetrics()

        doc_node = ast.get_node(ast.root_id)
        doc_len = max(len(doc_node.raw_text) if doc_node else 1, 1)

        # 1. AST Depth Variance across non-token nodes
        non_token_nodes = [n for n in ast.nodes if n.node_type != NodeType.TOKEN]
        depths = [n.depth for n in non_token_nodes]
        if depths:
            mean_depth = sum(depths) / len(depths)
            depth_variance = sum((d - mean_depth) ** 2 for d in depths) / len(depths)
        else:
            depth_variance = 0.0

        # 2. Sentence Length CV (Coefficient of Variation)
        sentence_nodes = ast.get_nodes_by_type(NodeType.SENTENCE)
        sentence_lengths = [len(n.raw_text.strip()) for n in sentence_nodes if n.raw_text.strip()]
        sentence_length_cv = self._calculate_cv(sentence_lengths)

        # 3. Paragraph Length CV
        paragraph_nodes = ast.get_nodes_by_type(NodeType.PARAGRAPH)
        paragraph_lengths = [len(n.raw_text.strip()) for n in paragraph_nodes if n.raw_text.strip()]
        paragraph_length_cv = self._calculate_cv(paragraph_lengths)

        # 4. Node Type Entropy
        node_type_counts: Dict[NodeType, int] = {}
        for n in ast.nodes:
            node_type_counts[n.node_type] = node_type_counts.get(n.node_type, 0) + 1

        total_nodes = len(ast.nodes)
        node_type_entropy = 0.0
        for count in node_type_counts.values():
            p = count / total_nodes
            node_type_entropy -= p * math.log2(p)

        # 5. Heading & List Density per 1000 characters
        heading_nodes = ast.get_nodes_by_type(NodeType.SECTION_HEADING)
        heading_density = (len(heading_nodes) / doc_len) * 1000.0

        # Count list items from paragraphs or text markers
        list_count = sum(1 for n in paragraph_nodes if n.raw_text.lstrip().startswith(("- ", "* ", "+ ", "・", "1.")))
        list_density = (list_count / doc_len) * 1000.0

        return StructuralMetrics(
            depth_variance=round(depth_variance, 4),
            sentence_length_cv=round(sentence_length_cv, 4),
            paragraph_length_cv=round(paragraph_length_cv, 4),
            node_type_entropy=round(node_type_entropy, 4),
            heading_density=round(heading_density, 4),
            list_density=round(list_density, 4),
        )

    def _calculate_cv(self, values: List[int]) -> float:
        if not values:
            return 0.0
        mean_val = sum(values) / len(values)
        if mean_val == 0:
            return 0.0
        variance = sum((v - mean_val) ** 2 for v in values) / len(values)
        std_dev = math.sqrt(variance)
        return std_dev / mean_val
