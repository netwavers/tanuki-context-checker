import re
import math
from typing import Dict, List, Set
from tanuki_checker.ast import DocumentAST, NodeType
from tanuki_checker.symbol import SymbolTable
from tanuki_checker.passes.base import IAnalysisPass, PassExecutionError
from tanuki_checker.metrics import FlowMetrics

DIGRESSION_PATTERNS = [
    r"余談だが", r"ちなみに", r"話は変わるが", r"ところで", r"それはさておき",
    r"脱線するが", r"蛇足だが", r"補足だが", r"寄り道", r"あ[、,]そういえば",
    r"話が変わるが", r"ふと思ったのだが",
    r"\bby the way\b", r"\bincidentally\b", r"\bas a side note\b",
    r"\bdigressing\b", r"\bon another note\b"
]

SELF_CORRECTION_PATTERNS = [
    r"いや[、,]", r"正確には", r"言い換えると", r"というか", r"むしろ",
    r"というよりは?", r"補足すると", r"訂正すると", r"前言を撤回すると",
    r"違った[、,]", r"失礼[、,]", r"正しくは", r"撤回",
    r"\bor rather\b", r"\bto be precise\b", r"\bmore accurately\b",
    r"\bthat is to say\b", r"\bin other words\b", r"\bcorrection:\b",
    r"\brather,\b", r"\bI mean\b"
]

FIRST_PERSON_EXPERIENCE_PATTERNS = [
    r"(?:私|僕|俺|自分|筆者|我々)\b.*?(?:体験|経験|試した|やってみた|感じた|と思った|と考えた|に気づいた|でハマった|失敗した|成功した|困った|驚いた|試作した|無駄にした|叫んでしまった|感動|寄り道|痛感|買ってみた|聴いてみた|落胆した|思い立って|遭遇した)",
    r"(?:体験|経験|試した|やってみた|感じた|と思った|と考えた|に気づいた|でハマった|失敗した|成功した|困った|驚いた|試作した|無駄にした|叫んでしまった|感動|寄り道|痛感|買ってみた|聴いてみた|落胆した|遭遇した).*?(?:私|僕|俺|自分|筆者|我々)\b",
    r"(?:私|僕|俺|自分|筆者|我々)\b.*?(?:の体験|の経験|の印象|の考え|の失敗)",
    r"(?<![A-Za-z0-9_/.-])I\b.*?(?:tested|tried|built|noticed|realized|experienced|encountered|found|felt|thought|struggled)",
    r"\bwhen I\b", r"\bin my experience\b", r"\bI noticed\b", r"\bI tested\b", r"\bI built\b", r"\bI tried\b", r"\bI realized\b"
]

STOP_WORDS = {
    "こと", "もの", "ため", "よう", "これ", "それ", "あれ", "これら", "それら",
    "です", "ます", "ある", "いる", "する", "なる", "できる", "について",
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "is", "are"
}


class FlowPass(IAnalysisPass):
    def __init__(self):
        self._digression_res = [re.compile(p, re.IGNORECASE) for p in DIGRESSION_PATTERNS]
        self._self_correction_res = [re.compile(p, re.IGNORECASE) for p in SELF_CORRECTION_PATTERNS]
        self._first_person_res = [re.compile(p, re.IGNORECASE) for p in FIRST_PERSON_EXPERIENCE_PATTERNS]

    @property
    def name(self) -> str:
        return "FlowPass"

    def execute(self, ast: DocumentAST, sym_table: SymbolTable) -> Dict[str, float]:
        try:
            metrics = self.analyze(ast, sym_table)
            return metrics.model_dump()
        except Exception as e:
            raise PassExecutionError(f"Error in FlowPass: {str(e)}") from e

    def analyze(self, ast: DocumentAST, sym_table: SymbolTable) -> FlowMetrics:
        doc_node = ast.get_node(ast.root_id)
        if not doc_node or not doc_node.raw_text:
            return FlowMetrics()

        text = doc_node.raw_text
        doc_len = max(len(text), 1)

        # 1. Digression & Topic Jumps
        digression_count = sum(len(r.findall(text)) for r in self._digression_res)

        # Iterate over consecutive paragraph pairs in AST, skipping headings/rules
        all_p_nodes = ast.get_nodes_by_type(NodeType.PARAGRAPH)
        topic_jumps = digression_count

        heading_ids = [n.node_id for n in ast.get_nodes_by_type(NodeType.SECTION_HEADING)]

        for i in range(len(all_p_nodes) - 1):
            curr_p = all_p_nodes[i]
            next_p = all_p_nodes[i + 1]

            curr_text = curr_p.raw_text.strip()
            next_text = next_p.raw_text.strip()

            # Skip headings, list items, rules, or meta closing lines
            if (
                curr_p.node_type == NodeType.SECTION_HEADING
                or next_p.node_type == NodeType.SECTION_HEADING
                or curr_text.startswith(("- ", "* ", "+ ", "1.", "2.", "3.", "4.", "5.", "#", "---"))
                or next_text.startswith(("- ", "* ", "+ ", "1.", "2.", "3.", "4.", "5.", "#", "---"))
                or "幸いです" in next_text or "お知らせください" in next_text
            ):
                continue

            # Skip if heading node exists between curr_p and next_p in node_id sequence
            has_heading_between = any(
                curr_p.node_id < hid < next_p.node_id for hid in heading_ids
            )
            if has_heading_between:
                continue

            if len(curr_text) >= 25 and len(next_text) >= 25:
                p1_words = self._extract_keywords(curr_text)
                p2_words = self._extract_keywords(next_text)

                if p1_words and p2_words:
                    intersection = p1_words.intersection(p2_words)
                    union = p1_words.union(p2_words)
                    jaccard = len(intersection) / len(union) if union else 1.0
                    if jaccard < 0.04:
                        topic_jumps += 1

        topic_jump_density = round((topic_jumps / doc_len) * 1000.0, 4)

        # 2. Self Correction Count
        clean_text_for_correction = re.sub(r"「.*?」|\".*?\"", "", text)
        self_correction_count = sum(len(r.findall(clean_text_for_correction)) for r in self._self_correction_res)

        # 3. Emphasis Imbalance Entropy
        p_lengths = [len(n.raw_text.strip()) for n in all_p_nodes if len(n.raw_text.strip()) > 0]
        emphasis_imbalance_entropy = self._calculate_emphasis_imbalance(p_lengths)

        # 4. First-Person Experience Density
        first_person_exp_count = sum(len(r.findall(text)) for r in self._first_person_res)

        first_person_symbols = [
            s for s in sym_table.symbols.values()
            if s.entity_type == "FIRST_PERSON" and s.name not in ["I", "we", "me", "my", "our", "us"]
        ]
        if first_person_exp_count == 0 and first_person_symbols:
            first_person_exp_count = len(first_person_symbols)

        first_person_experience_density = round((first_person_exp_count / doc_len) * 1000.0, 4)

        return FlowMetrics(
            topic_jump_density=topic_jump_density,
            self_correction_count=self_correction_count,
            emphasis_imbalance_entropy=round(emphasis_imbalance_entropy, 4),
            first_person_experience_density=first_person_experience_density,
        )

    def _extract_keywords(self, text: str) -> Set[str]:
        tokens = re.findall(r"[一-龠A-Za-z0-9_-]{2,}|[ァ-ンヴー]{2,}", text)
        return {t.lower() for t in tokens if t.lower() not in STOP_WORDS}

    def _calculate_emphasis_imbalance(self, lengths: List[int]) -> float:
        if len(lengths) <= 1:
            return 0.0

        total_len = sum(lengths)
        if total_len == 0:
            return 0.0

        num_p = len(lengths)
        probs = [l / total_len for l in lengths if l > 0]
        if not probs:
            return 0.0

        entropy = -sum(p * math.log2(p) for p in probs)
        max_entropy = math.log2(num_p)

        entropy_deficit = (1.0 - (entropy / max_entropy)) if max_entropy > 0 else 0.0

        mean_len = total_len / num_p
        variance = sum((l - mean_len) ** 2 for l in lengths) / num_p
        std_dev = math.sqrt(variance)
        cv = std_dev / mean_len if mean_len > 0 else 0.0

        imbalance = min(1.0, (entropy_deficit * 1.5) + (cv * 0.4))
        return imbalance
