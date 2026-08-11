import re
from typing import List, Tuple, Optional
from tanuki_checker.ast import (
    DocumentAST,
    ASTNode,
    NodeType,
    TokenTag,
    StringSlice,
)
from tanuki_checker.preprocessor import Preprocessor, DocumentBlock, ParagraphBlock, SentenceBlock

MAX_PARSER_DEPTH = 32

# Heuristic patterns for Japanese & English token tagging
HEDGE_PATTERNS = [
    r"と思われる", r"と考えられる", r"一説には", r"一般的には", r"と言えるでしょう",
    r"〜と考えられる", r"〜と思われる", r"推測される", r"見込まれる",
    r"it is generally believed", r"it seems that", r"arguably", r"may be considered",
    r"could be argued", r"it is worth noting", r"presumably"
]

FIRST_PERSON_PATTERNS = [
    r"私", r"僕", r"俺", r"当方", r"自分", r"筆者", r"我々",
    r"\bI\b", r"\bwe\b", r"\bmy\b", r"\bour\b", r"\bme\b", r"\bus\b"
]

CONJUNCTION_PATTERNS = [
    r"しかし", r"また", r"さらに", r"その結果", r"一方で", r"したがって", r"ただし",
    r"そして", r"ゆえに", r"そのため", r"なお", r"加えるに",
    r"\bhowever\b", r"\btherefore\b", r"\bmoreover\b", r"\bfurthermore\b",
    r"\bnevertheless\b", r"\bnonetheless\b", r"\bconversely\b", r"\badditionally\b"
]

MARKDOWN_PATTERNS = [
    r"```[a-zA-Z0-9_-]*", r"\*\*", r"`", r"^#{1,6}\s", r"^---+$", r"^>\s"
]


class ApproximateASTParser:
    """
    Approximate AST Parser building contiguous Arena Vector AST representation (DocumentAST).
    Enforces maximum recursion depth D_max = 32 to prevent stack overflow.
    """

    def __init__(self, language: str = "auto"):
        self.preprocessor = Preprocessor(language=language)
        self._hedge_re = re.compile("|".join(HEDGE_PATTERNS), re.IGNORECASE)
        self._first_person_re = re.compile("|".join(FIRST_PERSON_PATTERNS), re.IGNORECASE)
        self._conn_re = re.compile("|".join(CONJUNCTION_PATTERNS), re.IGNORECASE)
        self._markdown_re = re.compile("|".join(MARKDOWN_PATTERNS), re.IGNORECASE)

    def parse(self, text: str, doc_id: str = "doc_0") -> DocumentAST:
        doc_block = self.preprocessor.process(text)
        ast = DocumentAST(doc_id=doc_id)

        # Root DOCUMENT Node (depth=0)
        root_node = ast.add_node(
            node_type=NodeType.DOCUMENT,
            slice_range=StringSlice(start_char=0, end_char=len(doc_block.normalized_text)),
            raw_text=doc_block.normalized_text,
            parent_id=None,
            depth=0,
        )

        for p_block in doc_block.paragraphs:
            self._parse_paragraph(ast, root_node.node_id, p_block)

        return ast

    def _parse_paragraph(self, ast: DocumentAST, parent_id: int, p_block: ParagraphBlock):
        current_depth = ast.nodes[parent_id].depth + 1
        if current_depth >= MAX_PARSER_DEPTH:
            current_depth = MAX_PARSER_DEPTH

        node_type = NodeType.SECTION_HEADING if p_block.is_heading else NodeType.PARAGRAPH
        p_node = ast.add_node(
            node_type=node_type,
            slice_range=StringSlice(start_char=p_block.start_char, end_char=p_block.end_char),
            raw_text=p_block.text,
            parent_id=parent_id,
            depth=current_depth,
        )

        for s_block in p_block.sentences:
            self._parse_sentence(ast, p_node.node_id, s_block)

    def _parse_sentence(self, ast: DocumentAST, parent_id: int, s_block: SentenceBlock):
        current_depth = ast.nodes[parent_id].depth + 1
        if current_depth >= MAX_PARSER_DEPTH:
            current_depth = MAX_PARSER_DEPTH

        s_node = ast.add_node(
            node_type=NodeType.SENTENCE,
            slice_range=StringSlice(start_char=s_block.start_char, end_char=s_block.end_char),
            raw_text=s_block.text,
            parent_id=parent_id,
            depth=current_depth,
        )

        clauses = self._split_clauses(s_block.text, s_block.start_char)
        for c_text, c_start, c_end in clauses:
            self._parse_clause(ast, s_node.node_id, c_text, c_start, c_end)

    def _parse_clause(
        self, ast: DocumentAST, parent_id: int, clause_text: str, start_char: int, end_char: int
    ):
        current_depth = ast.nodes[parent_id].depth + 1
        if current_depth >= MAX_PARSER_DEPTH:
            current_depth = MAX_PARSER_DEPTH

        c_node = ast.add_node(
            node_type=NodeType.CLAUSE,
            slice_range=StringSlice(start_char=start_char, end_char=end_char),
            raw_text=clause_text,
            parent_id=parent_id,
            depth=current_depth,
        )

        tokens = self._tokenize(clause_text, start_char)
        token_depth = min(current_depth + 1, MAX_PARSER_DEPTH)

        for t_text, t_tag, t_start, t_end in tokens:
            ast.add_node(
                node_type=NodeType.TOKEN,
                slice_range=StringSlice(start_char=t_start, end_char=t_end),
                raw_text=t_text,
                parent_id=c_node.node_id,
                depth=token_depth,
                tag=t_tag,
            )

    def _split_clauses(self, text: str, base_offset: int) -> List[Tuple[str, int, int]]:
        """Split a sentence into clauses based on punctuation and conjunctions."""
        # Clause delimiters: Japanese 、/が/けれど/そして/また/ので/から, English , ;
        pattern = r"([^、,;]+[、,;]?)"
        matches = list(re.finditer(pattern, text))
        if not matches:
            return [(text, base_offset, base_offset + len(text))]

        clauses = []
        for m in matches:
            c_text = m.group(0).strip()
            if c_text:
                clauses.append(
                    (
                        c_text,
                        base_offset + m.start(),
                        base_offset + m.end(),
                    )
                )
        return clauses if clauses else [(text, base_offset, base_offset + len(text))]

    def _tokenize(self, text: str, base_offset: int) -> List[Tuple[str, Optional[TokenTag], int, int]]:
        """Extract tokens and assign tags based on heuristics."""
        tokens = []
        # Simple whitespace / punctuation tokenization
        raw_tokens = re.finditer(r"(\S+)", text)
        for m in raw_tokens:
            t_text = m.group(0)
            t_start = base_offset + m.start()
            t_end = base_offset + m.end()

            tag = self._determine_token_tag(t_text)
            tokens.append((t_text, tag, t_start, t_end))

        return tokens

    def _determine_token_tag(self, token_text: str) -> Optional[TokenTag]:
        if self._markdown_re.search(token_text):
            return TokenTag.MARKDOWN_SYMBOL
        if self._hedge_re.search(token_text):
            return TokenTag.HEDGE
        if self._first_person_re.search(token_text):
            return TokenTag.PRON
        if self._conn_re.search(token_text):
            return TokenTag.CONN
        return None
