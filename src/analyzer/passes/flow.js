import { NodeType } from '../ast.js';

const DIGRESSION_PATTERNS = [
  "余談だが", "ちなみに", "話は変わるが", "ところで", "それはさておき",
  "脱線するが", "蛇足だが", "補足だが", "寄り道", "あ[、,]そういえば",
  "話が変わるが", "ふと思ったのだが",
  "\\bby the way\\b", "\\bincidentally\\b", "\\bas a side note\\b",
  "\\bdigressing\\b", "\\bon another note\\b"
];

const SELF_CORRECTION_PATTERNS = [
  "いや[、,]", "正確には", "言い換えると", "というか", "むしろ",
  "というよりは?", "補足すると", "訂正すると", "前言を撤回すると",
  "違った[、,]", "失礼[、,]", "正しくは", "撤回",
  "\\bor rather\\b", "\\bto be precise\\b", "\\bmore accurately\\b",
  "\\bthat is to say\\b", "\\bin other words\\b", "\\bcorrection:\\b",
  "\\brather,\\b", "\\bI mean\\b"
];

const FIRST_PERSON_EXPERIENCE_PATTERNS = [
  "(?:私|僕|俺|自分|筆者|我々)\\b.*?(?:体験|経験|試した|やってみた|感じた|と思った|と考えた|に気づいた|でハマった|失敗した|成功した|困った|驚いた|試作した|無駄にした|叫んでしまった|感動|寄り道|痛感|買ってみた|聴いてみた|落胆した|思い立って|遭遇した)",
  "(?:体験|経験|試した|やってみた|感じた|と思った|と考えた|に気づいた|でハマった|失敗した|成功した|困った|驚いた|試作した|無駄にした|叫んでしまった|感動|寄り道|痛感|買ってみた|聴いてみた|落胆した|遭遇した).*?(?:私|僕|俺|自分|筆者|我々)\\b",
  "(?:私|僕|俺|自分|筆者|我々)\\b.*?(?:の体験|の経験|の印象|の考え|の失敗)",
  "(?<![A-Za-z0-9_/.-])I\\b.*?(?:tested|tried|built|noticed|realized|experienced|encountered|found|felt|thought|struggled)",
  "\\bwhen I\\b", "\\bin my experience\\b", "\\bI noticed\\b", "\\bI tested\\b", "\\bI built\\b", "\\bI tried\\b", "\\bI realized\\b"
];

const STOP_WORDS = new Set([
  "こと", "もの", "ため", "よう", "これ", "それ", "あれ", "これら", "それら",
  "です", "ます", "ある", "いる", "する", "なる", "できる", "について",
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "is", "are"
]);

export class FlowPass {
  constructor() {
    this._digressionRes = DIGRESSION_PATTERNS.map(p => new RegExp(p, 'gi'));
    this._selfCorrectionRes = SELF_CORRECTION_PATTERNS.map(p => new RegExp(p, 'gi'));
    this._firstPersonRes = FIRST_PERSON_EXPERIENCE_PATTERNS.map(p => new RegExp(p, 'gi'));
  }

  get name() {
    return 'FlowPass';
  }

  execute(ast, symTable) {
    const docNode = ast.get_node(ast.root_id);
    if (!docNode || !docNode.raw_text) {
      return {
        topic_jump_density: 0.0,
        self_correction_count: 0,
        emphasis_imbalance_entropy: 0.0,
        first_person_experience_density: 0.0
      };
    }

    const text = docNode.raw_text;
    const docLen = Math.max(text.length, 1);

    // 1. Digression & Topic Jumps
    let digressionCount = 0;
    for (const r of this._digressionRes) {
      const matches = text.match(r);
      if (matches) digressionCount += matches.length;
    }

    const allPNodes = ast.get_nodes_by_type(NodeType.PARAGRAPH);
    let topicJumps = digressionCount;
    const headingIds = ast.get_nodes_by_type(NodeType.SECTION_HEADING).map(n => n.node_id);

    for (let i = 0; i < allPNodes.length - 1; i++) {
      const currP = allPNodes[i];
      const nextP = allPNodes[i + 1];

      const currText = currP.raw_text.trim();
      const nextText = nextP.raw_text.trim();

      if (
        currP.node_type === NodeType.SECTION_HEADING ||
        nextP.node_type === NodeType.SECTION_HEADING ||
        /^(?:[-*+・]|\d+\.|#|---)/.test(currText) ||
        /^(?:[-*+・]|\d+\.|#|---)/.test(nextText) ||
        nextText.includes('幸いです') || nextText.includes('お知らせください')
      ) {
        continue;
      }

      const hasHeadingBetween = headingIds.some(hid => currP.node_id < hid && hid < nextP.node_id);
      if (hasHeadingBetween) continue;

      if (currText.length >= 25 && nextText.length >= 25) {
        const p1Words = this._extractKeywords(currText);
        const p2Words = this._extractKeywords(nextText);

        if (p1Words.size > 0 && p2Words.size > 0) {
          const intersection = new Set([...p1Words].filter(x => p2Words.has(x)));
          const union = new Set([...p1Words, ...p2Words]);
          const jaccard = union.size > 0 ? intersection.size / union.size : 1.0;
          if (jaccard < 0.04) {
            topicJumps++;
          }
        }
      }
    }

    const topicJumpDensity = Number(((topicJumps / docLen) * 1000.0).toFixed(4));

    // 2. Self Correction Count
    const cleanTextForCorrection = text.replace(/「.*?」|".*?"/g, '');
    let selfCorrectionCount = 0;
    for (const r of this._selfCorrectionRes) {
      const matches = cleanTextForCorrection.match(r);
      if (matches) selfCorrectionCount += matches.length;
    }

    // 3. Emphasis Imbalance Entropy
    const pLengths = allPNodes.map(n => n.raw_text.trim().length).filter(len => len > 0);
    const emphasisImbalanceEntropy = this._calculateEmphasisImbalance(pLengths);

    // 4. First-Person Experience Density
    let firstPersonExpCount = 0;
    for (const r of this._firstPersonRes) {
      const matches = text.match(r);
      if (matches) firstPersonExpCount += matches.length;
    }

    const firstPersonSymbols = Object.values(symTable.symbols).filter(
      s => s.entity_type === 'FIRST_PERSON' && !['I', 'we', 'me', 'my', 'our', 'us'].includes(s.name)
    );
    if (firstPersonExpCount === 0 && firstPersonSymbols.length > 0) {
      firstPersonExpCount = firstPersonSymbols.length;
    }

    const firstPersonExperienceDensity = Number(((firstPersonExpCount / docLen) * 1000.0).toFixed(4));

    return {
      topic_jump_density: topicJumpDensity,
      self_correction_count: selfCorrectionCount,
      emphasis_imbalance_entropy: Number(emphasisImbalanceEntropy.toFixed(4)),
      first_person_experience_density: firstPersonExperienceDensity
    };
  }

  _extractKeywords(text) {
    const tokens = text.match(/[一-龠A-Za-z0-9_-]{2,}|[ァ-ンヴー]{2,}/g) || [];
    const result = new Set();
    for (let i = 0; i < tokens.length; i++) {
      const lower = tokens[i].toLowerCase();
      if (!STOP_WORDS.has(lower)) {
        result.add(lower);
      }
    }
    return result;
  }

  _calculateEmphasisImbalance(lengths) {
    if (!lengths || lengths.length <= 1) return 0.0;
    const totalLen = lengths.reduce((a, b) => a + b, 0);
    if (totalLen === 0) return 0.0;

    const numP = lengths.length;
    const probs = lengths.filter(l => l > 0).map(l => l / totalLen);
    if (probs.length === 0) return 0.0;

    const entropy = -probs.reduce((acc, p) => acc + p * Math.log2(p), 0);
    const maxEntropy = Math.log2(numP);

    const entropyDeficit = maxEntropy > 0 ? 1.0 - (entropy / maxEntropy) : 0.0;

    const meanLen = totalLen / numP;
    const variance = lengths.reduce((acc, l) => acc + Math.pow(l - meanLen, 2), 0) / numP;
    const stdDev = Math.sqrt(variance);
    const cv = meanLen > 0 ? stdDev / meanLen : 0.0;

    return Math.min(1.0, (entropyDeficit * 1.5) + (cv * 0.4));
  }
}
