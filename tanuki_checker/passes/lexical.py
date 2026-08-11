import re
import math
from typing import Dict, List
from tanuki_checker.ast import DocumentAST, NodeType, TokenTag
from tanuki_checker.symbol import SymbolTable
from tanuki_checker.passes.base import IAnalysisPass, PassExecutionError
from tanuki_checker.metrics import LexicalMetrics

AI_FREQUENT_PHRASES = [
    r"徹底解説",
    r"以下のポイントに留意",
    r"まとめとして",
    r"をはじめとする",
    r"多角的な視点から",
    r"重要な役割を果たし",
    r"詳しく見ていきましょう",
    r"背景には.*?挙げられます",
    r"注目を集めています",
    r"本記事では",
    r"一概には言えませんが",
    r"不可欠な要素",
    r"実践的な",
    r"注力することが推奨されます",
    r"環境を整備することが重要",
    r"ご参考になりましたら幸いです",
    r"お気軽にお知らせください",
    r"以下のメリット",
    r"を享受",
    r"是非.*?ご検討ください",
    r"結論から言うと",
    r"結局のところ",
    r"これからの時代",
    r"大切になってくる",
    r"コメントで教えて",
    r"\bin conclusion\b",
    r"\bit is worth noting\b",
    r"\bdelve into\b",
    r"\bplays a crucial role\b",
    r"\btestament to\b",
    r"\btapestry of\b",
    r"\bin today's fast-paced world\b",
]

HEDGE_EXPRESSIONS = [
    r"と思われる",
    r"と考えられる",
    r"一説には",
    r"一般的には",
    r"と言えるでしょう",
    r"推測される",
    r"見込まれる",
    r"可能性が高い",
    r"\bit is generally believed\b",
    r"\bit seems that\b",
    r"\barguably\b",
    r"\bmay be considered\b",
    r"\bcould be argued\b",
]


class LexicalPass(IAnalysisPass):
    def __init__(self):
        self._ai_phrase_res = [re.compile(p, re.IGNORECASE) for p in AI_FREQUENT_PHRASES]
        self._hedge_res = [re.compile(p, re.IGNORECASE) for p in HEDGE_EXPRESSIONS]

    @property
    def name(self) -> str:
        return "LexicalPass"

    def execute(self, ast: DocumentAST, sym_table: SymbolTable) -> Dict[str, float]:
        try:
            metrics = self.analyze(ast, sym_table)
            return metrics.model_dump()
        except Exception as e:
            raise PassExecutionError(f"Error in LexicalPass: {str(e)}") from e

    def analyze(self, ast: DocumentAST, sym_table: SymbolTable) -> LexicalMetrics:
        doc_node = ast.get_node(ast.root_id)
        if not doc_node or not doc_node.raw_text:
            return LexicalMetrics()

        text = doc_node.raw_text
        text_len = max(len(text), 1)

        # 1. AI Phrase Density
        ai_phrase_count = sum(len(r.findall(text)) for r in self._ai_phrase_res)

        # Density per 1000 characters
        ai_phrase_density = (ai_phrase_count / text_len) * 1000.0

        # 2. Hedge Expression Ratio
        hedge_count = sum(len(r.findall(text)) for r in self._hedge_res)

        sentence_nodes = ast.get_nodes_by_type(NodeType.SENTENCE)
        total_sentences = max(len(sentence_nodes), 1)
        hedge_expression_ratio = min(hedge_count / total_sentences, 1.0)

        # 3. N-gram Entropy (Character 2-gram entropy)
        ngram_entropy = self._calculate_ngram_entropy(text, n=2)

        return LexicalMetrics(
            ai_phrase_density=round(ai_phrase_density, 4),
            ngram_entropy=round(ngram_entropy, 4),
            hedge_expression_ratio=round(hedge_expression_ratio, 4),
        )

    def _calculate_ngram_entropy(self, text: str, n: int = 2) -> float:
        cleaned_text = re.sub(r"\s+", "", text)
        if len(cleaned_text) < n:
            return 0.0

        ngrams: Dict[str, int] = {}
        total_ngrams = len(cleaned_text) - n + 1
        for i in range(total_ngrams):
            gram = cleaned_text[i : i + n]
            ngrams[gram] = ngrams.get(gram, 0) + 1

        entropy = 0.0
        for count in ngrams.values():
            p = count / total_ngrams
            entropy -= p * math.log2(p)

        return entropy
