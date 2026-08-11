from typing import Dict, List
from enum import Enum
from pydantic import BaseModel, Field


class EntityScope(str, Enum):
    GLOBAL = "GLOBAL"
    PARAGRAPH = "PARAGRAPH"
    LOCAL_CLAUSE = "LOCAL_CLAUSE"


class SymbolEntry(BaseModel):
    symbol_id: int
    name: str
    entity_type: str  # PER, ORG, LOC, FIRST_PERSON, UNRESOLVED_REF, etc.
    first_appeared_node_id: int
    referenced_node_ids: List[int] = Field(default_factory=list)
    scope: EntityScope = EntityScope.GLOBAL
    is_implicit: bool = False  # 人間文章特有の暗黙の文脈共有フラグ


class SymbolTable(BaseModel):
    symbols: Dict[str, SymbolEntry] = Field(default_factory=dict)
    unresolved_references_count: int = 0

    def add_symbol(
        self,
        name: str,
        entity_type: str,
        node_id: int,
        scope: EntityScope = EntityScope.GLOBAL,
        is_implicit: bool = False,
    ) -> SymbolEntry:
        if name in self.symbols:
            entry = self.symbols[name]
            if node_id not in entry.referenced_node_ids:
                entry.referenced_node_ids.append(node_id)
            return entry
        else:
            symbol_id = len(self.symbols)
            entry = SymbolEntry(
                symbol_id=symbol_id,
                name=name,
                entity_type=entity_type,
                first_appeared_node_id=node_id,
                referenced_node_ids=[node_id],
                scope=scope,
                is_implicit=is_implicit,
            )
            self.symbols[name] = entry
            return entry
