export class SurfacePass {
  constructor() {
    this._markdownRe = /```[a-zA-Z]*|\*\*.*?\*\*|^---+$|###?\s/gm;
    this._emDashRe = /―|—|--/g;
    this._puncRe = /[。！？.!?]/g;
  }

  get name() {
    return 'SurfacePass';
  }

  execute(ast, symTable) {
    const docNode = ast.get_node(ast.root_id);
    if (!docNode || !docNode.raw_text) {
      return {
        markdown_anomaly_score: 0.0,
        punctuation_uniformity: 0.0,
        em_dash_density: 0.0
      };
    }

    const text = docNode.raw_text;
    const textLen = Math.max(text.length, 1);

    // 1. Markdown Anomaly Score
    const mdMatches = text.match(this._markdownRe) || [];
    const mdCharCount = mdMatches.reduce((acc, m) => acc + m.length, 0);
    const markdownAnomalyScore = Math.min((mdCharCount / textLen) * 20.0, 1.0);

    // 2. Em-Dash Density
    const emDashes = text.match(this._emDashRe) || [];
    const emDashDensity = (emDashes.length / textLen) * 1000.0;

    // 3. Punctuation Uniformity
    const puncPositions = [];
    let match;
    const puncRegex = new RegExp(this._puncRe.source, 'g');
    while ((match = puncRegex.exec(text)) !== null) {
      puncPositions.push(match.index);
    }

    let punctuationUniformity = 0.5;
    if (puncPositions.length >= 3) {
      const gaps = [];
      for (let i = 1; i < puncPositions.length; i++) {
        gaps.push(puncPositions[i] - puncPositions[i - 1]);
      }
      const meanGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const variance = gaps.reduce((acc, g) => acc + Math.pow(g - meanGap, 2), 0) / gaps.length;
      const stdGap = Math.sqrt(variance);
      const cvGap = meanGap > 0 ? stdGap / meanGap : 0.0;
      punctuationUniformity = Math.max(0.0, Math.min(1.0, 1.0 - cvGap));
    }

    return {
      markdown_anomaly_score: Number(markdownAnomalyScore.toFixed(4)),
      punctuation_uniformity: Number(punctuationUniformity.toFixed(4)),
      em_dash_density: Number(emDashDensity.toFixed(4))
    };
  }
}
