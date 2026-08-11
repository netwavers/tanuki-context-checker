/**
 * AST Node Definition in JavaScript (Contiguous Arena Vector Store)
 */
export const NodeType = Object.freeze({
  DOCUMENT: 'DOCUMENT',
  SECTION_HEADING: 'SECTION_HEADING',
  PARAGRAPH: 'PARAGRAPH',
  SENTENCE: 'SENTENCE',
  CLAUSE: 'CLAUSE',
  TOKEN: 'TOKEN',
});

export const TokenTag = Object.freeze({
  NOUN: 'NOUN',
  PROPN: 'PROPN',
  PRON: 'PRON',
  VERB: 'VERB',
  ADJ: 'ADJ',
  CONN: 'CONN',
  HEDGE: 'HEDGE',
  MARKDOWN_SYMBOL: 'MARKDOWN_SYMBOL',
});

export class StringSlice {
  constructor(startChar, endChar) {
    this.startChar = startChar;
    this.endChar = endChar;
  }
}

export class ASTNode {
  constructor(nodeId, nodeType, parentId, sliceRange, depth, rawText = '', tag = null) {
    this.node_id = nodeId;
    this.node_type = nodeType;
    this.parent_id = parentId;
    this.child_ids = [];
    this.slice = sliceRange;
    this.depth = depth;
    this.raw_text = rawText;
    this.tag = tag;
  }
}

export class DocumentAST {
  constructor(docId = 'doc_0') {
    this.doc_id = docId;
    this.nodes = [];
    this.root_id = 0;
    this.total_tokens = 0;
    this.max_depth = 0;
  }

  add_node(nodeType, sliceRange, rawText = '', parentId = null, depth = 0, tag = null) {
    const nodeId = this.nodes.length;
    const node = new ASTNode(nodeId, nodeType, parentId, sliceRange, depth, rawText, tag);
    this.nodes.push(node);

    if (parentId !== null && parentId >= 0 && parentId < this.nodes.length) {
      this.nodes[parentId].child_ids.push(nodeId);
    }

    if (depth > this.max_depth) {
      this.max_depth = depth;
    }
    if (nodeType === NodeType.TOKEN) {
      this.total_tokens += 1;
    }

    return node;
  }

  get_node(nodeId) {
    if (nodeId >= 0 && nodeId < this.nodes.length) {
      return this.nodes[nodeId];
    }
    return null;
  }

  get_nodes_by_type(nodeType) {
    return this.nodes.filter(n => n.node_type === nodeType);
  }
}
