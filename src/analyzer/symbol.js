export const EntityScope = Object.freeze({
  GLOBAL: 'GLOBAL',
  PARAGRAPH: 'PARAGRAPH',
  LOCAL_CLAUSE: 'LOCAL_CLAUSE',
});

export class SymbolEntry {
  constructor(symbolId, name, entityType, firstAppearedNodeId, scope = EntityScope.GLOBAL, isImplicit = false) {
    this.symbol_id = symbolId;
    this.name = name;
    this.entity_type = entityType;
    this.first_appeared_node_id = firstAppearedNodeId;
    this.referenced_node_ids = [firstAppearedNodeId];
    this.scope = scope;
    this.is_implicit = isImplicit;
  }
}

export class SymbolTable {
  constructor() {
    this.symbols = {}; // Keyed by name or unique key
    this.unresolved_references_count = 0;
  }

  add_symbol(name, entityType, nodeId, scope = EntityScope.GLOBAL, isImplicit = false) {
    if (this.symbols[name]) {
      this.symbols[name].referenced_node_ids.push(nodeId);
      return this.symbols[name];
    }
    const symbolId = Object.keys(this.symbols).length;
    const entry = new SymbolEntry(symbolId, name, entityType, nodeId, scope, isImplicit);
    this.symbols[name] = entry;
    return entry;
  }
}
