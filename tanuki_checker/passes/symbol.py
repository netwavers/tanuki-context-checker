import re
from typing import Dict, List, Set
from tanuki_checker.ast import DocumentAST, NodeType
from tanuki_checker.symbol import SymbolTable, EntityScope
from tanuki_checker.passes.base import IAnalysisPass, PassExecutionError

FIRST_PERSON_TERMS = [
    r"私", r"僕", r"俺", r"当方", r"自分", r"筆者", r"我々", r"わし", r"小生",
    r"(?<![A-Za-z0-9_/.-])I(?![A-Za-z0-9_/.-])",
    r"(?<![A-Za-z0-9_/.-])we(?![A-Za-z0-9_/.-])",
    r"(?<![A-Za-z0-9_/.-])my(?![A-Za-z0-9_/.-])",
    r"(?<![A-Za-z0-9_/.-])our(?![A-Za-z0-9_/.-])",
    r"(?<![A-Za-z0-9_/.-])me(?![A-Za-z0-9_/.-])",
    r"(?<![A-Za-z0-9_/.-])us(?![A-Za-z0-9_/.-])"
]

DEMONSTRATIVE_TERMS = [
    r"これ", r"それ", r"あれ", r"この", r"その", r"あの", r"同氏", r"同社", r"同省", r"前述", r"前文",
    r"\bthis\b", r"\bthat\b", r"\bthese\b", r"\bthose\b", r"\bit\b", r"\bthey\b"
]

PROPER_NOUN_PATTERNS = [
    r"[A-Z][a-zA-Z0-9_-]+",
    r"[ァ-ンヴー]{2,}",
    r"(?:開発|チーム|コミュニケーション|処理|メリット|機能|システム|設定|コンテナ|コード|技術|概要|記事|背景|課題|問題|対応|結果|提案|導入)"
]


class SymbolPass(IAnalysisPass):
    def __init__(self):
        self._first_person_res = [re.compile(p, re.IGNORECASE) for p in FIRST_PERSON_TERMS]
        self._proper_noun_res = [re.compile(p) for p in PROPER_NOUN_PATTERNS]
        self._demonstrative_res = [re.compile(p, re.IGNORECASE) for p in DEMONSTRATIVE_TERMS]

    @property
    def name(self) -> str:
        return "SymbolPass"

    def execute(self, ast: DocumentAST, sym_table: SymbolTable) -> Dict[str, float]:
        try:
            return self.analyze(ast, sym_table)
        except Exception as e:
            raise PassExecutionError(f"Error in SymbolPass: {str(e)}") from e

    def analyze(self, ast: DocumentAST, sym_table: SymbolTable) -> Dict[str, float]:
        paragraph_nodes = ast.get_nodes_by_type(NodeType.PARAGRAPH)
        established_entities: Set[str] = set()

        for p_idx, p_node in enumerate(paragraph_nodes):
            p_text = p_node.raw_text

            # 1. First-person references
            for r in self._first_person_res:
                m = r.search(p_text)
                if m:
                    matched_str = m.group(0)
                    sym_table.add_symbol(
                        name=matched_str,
                        entity_type="FIRST_PERSON",
                        node_id=p_node.node_id,
                        scope=EntityScope.GLOBAL,
                        is_implicit=False,
                    )
                    established_entities.add(matched_str)

            # 2. Proper Nouns & Noun Entities
            for r in self._proper_noun_res:
                matches = r.findall(p_text)
                for match in matches:
                    if match in ["I", "we", "my", "our", "me", "us", "I/O"]:
                        continue
                    sym_table.add_symbol(
                        name=match,
                        entity_type="PROPN",
                        node_id=p_node.node_id,
                        scope=EntityScope.GLOBAL,
                        is_implicit=False,
                    )
                    established_entities.add(match)

            # 3. Demonstratives & Unresolved/Implicit References
            for r in self._demonstrative_res:
                m = r.search(p_text)
                if m:
                    d_term = m.group(0)
                    # Check if preceding paragraph or current paragraph established entities
                    is_implicit = len(established_entities) == 0
                    sym_table.add_symbol(
                        name=d_term,
                        entity_type="DEMONSTRATIVE",
                        node_id=p_node.node_id,
                        scope=EntityScope.PARAGRAPH,
                        is_implicit=is_implicit,
                    )
                    if is_implicit:
                        sym_table.unresolved_references_count += 1

        total_symbols = len(sym_table.symbols)
        first_person_count = sum(1 for s in sym_table.symbols.values() if s.entity_type == "FIRST_PERSON")
        implicit_ratio = (
            sym_table.unresolved_references_count / total_symbols if total_symbols > 0 else 0.0
        )

        return {
            "total_symbols": float(total_symbols),
            "first_person_count": float(first_person_count),
            "unresolved_references_count": float(sym_table.unresolved_references_count),
            "implicit_ratio": round(implicit_ratio, 4),
        }
