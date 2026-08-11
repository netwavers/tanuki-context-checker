import { NodeType } from '../ast.js';

const AI_FREQUENT_PHRASES = [
  "徹底解説",
  "以下のポイントに留意",
  "まとめとして",
  "をはじめとする",
  "多角的な視点から",
  "重要な役割を果たし",
  "詳しく見ていきましょう",
  "背景には.*?挙げられます",
  "注目を集めています",
  "本記事では",
  "一概には言えませんが",
  "不可欠な要素",
  "実践的な",
  "注力することが推奨されます",
  "環境を整備することが重要",
  "ご参考になりましたら幸いです",
  "お気軽にお知らせください",
  "以下のメリット",
  "を享受",
  "是非.*?ご検討ください",
  "結論から言うと",
  "結局のところ",
  "これからの時代",
  "大切になってくる",
  "コメントで教えて",
  "\\bin conclusion\\b",
  "\\bit is worth noting\\b",
  "\\bdelve into\\b",
  "\\bplays a crucial role\\b",
  "\\btestament to\\b",
  "\\btapestry of\\b",
  "\\bin today's fast-paced world\\b",
];

const HEDGE_EXPRESSIONS = [
  "と思われる",
  "と考えられる",
  "一説には",
  "一般的には",
  "と言えるでしょう",
  "推測される",
  "見込まれる",
  "可能性が高い",
  "\\bit is generally believed\\b",
  "\\bit seems that\\b",
  "\\barguably\\b",
  "\\bmay be considered\\b",
  "\\bcould be argued\\b",
];

export class LexicalPass {
  constructor() {
    this._aiPhraseRes = AI_FREQUENT_PHRASES.map(p => new RegExp(p, 'gi'));
    this._hedgeRes = HEDGE_EXPRESSIONS.map(p => new RegExp(p, 'gi'));
  }

  get name() {
    return 'LexicalPass';
  }

  execute(ast, symTable) {
    const docNode = ast.get_node(ast.root_id);
    if (!docNode || !docNode.raw_text) {
      return {
        ai_phrase_density: 0.0,
        ngram_entropy: 0.0,
        hedge_expression_ratio: 0.0
      };
    }

    const text = docNode.raw_text;
    const textLen = Math.max(text.length, 1);

    // 1. AI Phrase Density
    let aiPhraseCount = 0;
    for (const r of this._aiPhraseRes) {
      const matches = text.match(r);
      if (matches) aiPhraseCount += matches.length;
    }
    const aiPhraseDensity = (aiPhraseCount / textLen) * 1000.0;

    // 2. Hedge Expression Ratio
    let hedgeCount = 0;
    for (const r of this._hedgeRes) {
      const matches = text.match(r);
      if (matches) hedgeCount += matches.length;
    }
    const sentenceNodes = ast.get_nodes_by_type(NodeType.SENTENCE);
    const totalSentences = Math.max(sentenceNodes.length, 1);
    const hedgeExpressionRatio = Math.min(hedgeCount / totalSentences, 1.0);

    // 3. N-gram Entropy (Character 2-gram entropy)
    const ngramEntropy = this._calculateNgramEntropy(text, 2);

    return {
      ai_phrase_density: Number(aiPhraseDensity.toFixed(4)),
      ngram_entropy: Number(ngramEntropy.toFixed(4)),
      hedge_expression_ratio: Number(hedgeExpressionRatio.toFixed(4))
    };
  }

  _calculateNgramEntropy(text, n = 2) {
    const cleanedText = text.replace(/\s+/g, '');
    if (cleanedText.length < n) return 0.0;

    const ngrams = {};
    const totalNgrams = cleanedText.length - n + 1;
    for (let i = 0; i < totalNgrams; i++) {
      const gram = cleanedText.slice(i, i + n);
      ngrams[gram] = (ngrams[gram] || 0) + 1;
    }

    let entropy = 0.0;
    for (const count of Object.values(ngrams)) {
      const p = count / totalNgrams;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }
}
