import { DocumentAST, NodeType, TokenTag, StringSlice } from './ast.js';
import { Preprocessor } from './preprocessor.js';

const MAX_PARSER_DEPTH = 32;

const HEDGE_PATTERNS = [
  "と思われる", "と考えられる", "一説には", "一般的には", "と言えるでしょう",
  "〜と考えられる", "〜と思われる", "推測される", "見込まれる",
  "it is generally believed", "it seems that", "arguably", "may be considered",
  "could be argued", "it is worth noting", "presumably"
];

const FIRST_PERSON_PATTERNS = [
  "私", "僕", "俺", "当方", "自分", "筆者", "我々",
  "\\bI\\b", "\\bwe\\b", "\\bmy\\b", "\\bour\\b", "\\bme\\b", "\\bus\\b"
];

const CONJUNCTION_PATTERNS = [
  "しかし", "また", "さらに", "その結果", "一方で", "したがって", "ただし",
  "そして", "ゆえに", "そのため", "なお", "加えるに",
  "\\bhowever\\b", "\\btherefore\\b", "\\bmoreover\\b", "\\bfurthermore\\b",
  "\\bnevertheless\\b", "\\bnonetheless\\b", "\\bconversely\\b", "\\badditionally\\b"
];

const MARKDOWN_PATTERNS = [
  "```[a-zA-Z0-9_-]*", "\\*\\*", "`", "^#{1,6}\\s", "^---+$", "^>\\s"
];

export class ApproximateASTParser {
  constructor(language = 'auto') {
    this.preprocessor = new Preprocessor(language);
    this._hedgeRe = new RegExp(HEDGE_PATTERNS.join('|'), 'i');
    this._firstPersonRe = new RegExp(FIRST_PERSON_PATTERNS.join('|'), 'i');
    this._connRe = new RegExp(CONJUNCTION_PATTERNS.join('|'), 'i');
    this._markdownRe = new RegExp(MARKDOWN_PATTERNS.join('|'), 'i');
  }

  parse(text, docId = 'doc_0') {
    const docBlock = this.preprocessor.process(text);
    const ast = new DocumentAST(docId);

    // Root DOCUMENT Node
    const rootNode = ast.add_node(
      NodeType.DOCUMENT,
      new StringSlice(0, docBlock.normalized_text.length),
      docBlock.normalized_text,
      null,
      0
    );

    for (let i = 0; i < docBlock.paragraphs.length; i++) {
      this._parseParagraph(ast, rootNode.node_id, docBlock.paragraphs[i]);
    }

    return ast;
  }

  _parseParagraph(ast, parentId, pBlock) {
    let currentDepth = ast.nodes[parentId].depth + 1;
    if (currentDepth >= MAX_PARSER_DEPTH) currentDepth = MAX_PARSER_DEPTH;

    const nodeType = pBlock.is_heading ? NodeType.SECTION_HEADING : NodeType.PARAGRAPH;
    const pNode = ast.add_node(
      nodeType,
      new StringSlice(pBlock.start_char, pBlock.end_char),
      pBlock.text,
      parentId,
      currentDepth
    );

    for (let i = 0; i < pBlock.sentences.length; i++) {
      this._parseSentence(ast, pNode.node_id, pBlock.sentences[i]);
    }
  }

  _parseSentence(ast, parentId, sBlock) {
    let currentDepth = ast.nodes[parentId].depth + 1;
    if (currentDepth >= MAX_PARSER_DEPTH) currentDepth = MAX_PARSER_DEPTH;

    const sNode = ast.add_node(
      NodeType.SENTENCE,
      new StringSlice(sBlock.start_char, sBlock.end_char),
      sBlock.text,
      parentId,
      currentDepth
    );

    const clauses = this._splitClauses(sBlock.text, sBlock.start_char);
    for (let i = 0; i < clauses.length; i++) {
      const [cText, cStart, cEnd] = clauses[i];
      this._parseClause(ast, sNode.node_id, cText, cStart, cEnd);
    }
  }

  _parseClause(ast, parentId, clauseText, startChar, endChar) {
    let currentDepth = ast.nodes[parentId].depth + 1;
    if (currentDepth >= MAX_PARSER_DEPTH) currentDepth = MAX_PARSER_DEPTH;

    const cNode = ast.add_node(
      NodeType.CLAUSE,
      new StringSlice(startChar, endChar),
      clauseText,
      parentId,
      currentDepth
    );

    const tokens = this._tokenize(clauseText, startChar);
    const tokenDepth = Math.min(currentDepth + 1, MAX_PARSER_DEPTH);

    for (let i = 0; i < tokens.length; i++) {
      const [tText, tTag, tStart, tEnd] = tokens[i];
      ast.add_node(
        NodeType.TOKEN,
        new StringSlice(tStart, tEnd),
        tText,
        cNode.node_id,
        tokenDepth,
        tTag
      );
    }
  }

  _splitClauses(text, baseOffset) {
    const pattern = /([^、,;]+[、,;]?)/g;
    const clauses = [];
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const cText = match[0].trim();
      if (cText) {
        clauses.push([
          cText,
          baseOffset + match.index,
          baseOffset + match.index + match[0].length
        ]);
      }
    }

    return clauses.length > 0 ? clauses : [[text, baseOffset, baseOffset + text.length]];
  }

  _tokenize(text, baseOffset) {
    const tokens = [];
    const pattern = /(\S+)/g;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const tText = match[0];
      const tStart = baseOffset + match.index;
      const tEnd = baseOffset + match.index + tText.length;
      const tag = this._determineTokenTag(tText);
      tokens.push([tText, tag, tStart, tEnd]);
    }

    return tokens;
  }

  _determineTokenTag(tokenText) {
    if (this._markdownRe.test(tokenText)) return TokenTag.MARKDOWN_SYMBOL;
    if (this._hedgeRe.test(tokenText)) return TokenTag.HEDGE;
    if (this._firstPersonRe.test(tokenText)) return TokenTag.PRON;
    if (this._connRe.test(tokenText)) return TokenTag.CONN;
    return null;
  }
}
