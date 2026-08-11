from typing import List, Optional
from enum import Enum
from pydantic import BaseModel, Field


class NodeType(str, Enum):
    DOCUMENT = "DOCUMENT"
    SECTION_HEADING = "SECTION_HEADING"
    PARAGRAPH = "PARAGRAPH"
    SENTENCE = "SENTENCE"
    CLAUSE = "CLAUSE"
    TOKEN = "TOKEN"


class TokenTag(str, Enum):
    NOUN = "NOUN"
    PROPN = "PROPN"
    PRON = "PRON"           # 一人称・経験表現含む
    VERB = "VERB"
    ADJ = "ADJ"
    CONN = "CONN"           # 接続詞
    HEDGE = "HEDGE"         # ヘッジ表現（〜と思われる、一説には等）
    MARKDOWN_SYMBOL = "MARKDOWN_SYMBOL"


class StringSlice(BaseModel):
    start_char: int
    end_char: int


class ASTNode(BaseModel):
    node_id: int
    node_type: NodeType
    parent_id: Optional[int] = None
    child_ids: List[int] = Field(default_factory=list)
    slice: StringSlice
    depth: int
    tag: Optional[TokenTag] = None
    raw_text: str
    vector_embedding: Optional[List[float]] = None


class DocumentAST(BaseModel):
    doc_id: str
    nodes: List[ASTNode] = Field(default_factory=list)  # Arena Vector (Index == NodeId)
    root_id: int = 0
    total_tokens: int = 0
    max_depth: int = 0

    def add_node(
        self,
        node_type: NodeType,
        slice_range: StringSlice,
        raw_text: str,
        parent_id: Optional[int] = None,
        depth: int = 0,
        tag: Optional[TokenTag] = None,
        vector_embedding: Optional[List[float]] = None,
    ) -> ASTNode:
        """Contiguous Arena vector allocation for ASTNode."""
        node_id = len(self.nodes)
        node = ASTNode(
            node_id=node_id,
            node_type=node_type,
            parent_id=parent_id,
            child_ids=[],
            slice=slice_range,
            depth=depth,
            tag=tag,
            raw_text=raw_text,
            vector_embedding=vector_embedding,
        )
        self.nodes.append(node)
        if parent_id is not None and parent_id < len(self.nodes):
            self.nodes[parent_id].child_ids.append(node_id)

        if depth > self.max_depth:
            self.max_depth = depth
        if node_type == NodeType.TOKEN:
            self.total_tokens += 1

        return node

    def get_node(self, node_id: int) -> Optional[ASTNode]:
        if 0 <= node_id < len(self.nodes):
            return self.nodes[node_id]
        return None

    def get_children(self, node_id: int) -> List[ASTNode]:
        node = self.get_node(node_id)
        if not node:
            return []
        return [self.nodes[cid] for cid in node.child_ids if cid < len(self.nodes)]

    def get_nodes_by_type(self, node_type: NodeType) -> List[ASTNode]:
        return [n for n in self.nodes if n.node_type == node_type]
