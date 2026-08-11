import { NodeType } from '../ast.js';

export class StructuralPass {
  get name() {
    return 'StructuralPass';
  }

  execute(ast, symTable) {
    if (!ast.nodes || ast.nodes.length === 0) {
      return {
        depth_variance: 0.0,
        sentence_length_cv: 0.0,
        paragraph_length_cv: 0.0,
        node_type_entropy: 0.0,
        heading_density: 0.0,
        list_density: 0.0
      };
    }

    const docNode = ast.get_node(ast.root_id);
    const docLen = Math.max(docNode && docNode.raw_text ? docNode.raw_text.length : 1, 1);

    // 1. AST Depth Variance across non-token nodes
    const nonTokenNodes = ast.nodes.filter(n => n.node_type !== NodeType.TOKEN);
    const depths = nonTokenNodes.map(n => n.depth);
    let depthVariance = 0.0;
    if (depths.length > 0) {
      const meanDepth = depths.reduce((a, b) => a + b, 0) / depths.length;
      depthVariance = depths.reduce((acc, d) => acc + Math.pow(d - meanDepth, 2), 0) / depths.length;
    }

    // 2. Sentence Length CV
    const sentenceNodes = ast.get_nodes_by_type(NodeType.SENTENCE);
    const sentenceLengths = sentenceNodes
      .map(n => n.raw_text.trim().length)
      .filter(len => len > 0);
    const sentenceLengthCv = this._calculateCv(sentenceLengths);

    // 3. Paragraph Length CV
    const paragraphNodes = ast.get_nodes_by_type(NodeType.PARAGRAPH);
    const paragraphLengths = paragraphNodes
      .map(n => n.raw_text.trim().length)
      .filter(len => len > 0);
    const paragraphLengthCv = this._calculateCv(paragraphLengths);

    // 4. Node Type Entropy
    const nodeTypeCounts = {};
    for (const n of ast.nodes) {
      nodeTypeCounts[n.node_type] = (nodeTypeCounts[n.node_type] || 0) + 1;
    }
    const totalNodes = ast.nodes.length;
    let nodeTypeEntropy = 0.0;
    for (const count of Object.values(nodeTypeCounts)) {
      const p = count / totalNodes;
      nodeTypeEntropy -= p * Math.log2(p);
    }

    // 5. Heading & List Density per 1000 characters
    const headingNodes = ast.get_nodes_by_type(NodeType.SECTION_HEADING);
    const headingDensity = (headingNodes.length / docLen) * 1000.0;

    let listCount = 0;
    for (const n of paragraphNodes) {
      const stripped = n.raw_text.replace(/^\s+/, '');
      if (/^(?:[-*+・]|\d+\.)/.test(stripped)) {
        listCount++;
      }
    }
    const listDensity = (listCount / docLen) * 1000.0;

    return {
      depth_variance: Number(depthVariance.toFixed(4)),
      sentence_length_cv: Number(sentenceLengthCv.toFixed(4)),
      paragraph_length_cv: Number(paragraphLengthCv.toFixed(4)),
      node_type_entropy: Number(nodeTypeEntropy.toFixed(4)),
      heading_density: Number(headingDensity.toFixed(4)),
      list_density: Number(listDensity.toFixed(4))
    };
  }

  _calculateCv(values) {
    if (!values || values.length === 0) return 0.0;
    const meanVal = values.reduce((a, b) => a + b, 0) / values.length;
    if (meanVal === 0) return 0.0;
    const variance = values.reduce((acc, v) => acc + Math.pow(v - meanVal, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return stdDev / meanVal;
  }
}
