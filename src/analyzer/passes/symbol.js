import { NodeType } from '../ast.js';
import { EntityScope } from '../symbol.js';

const FIRST_PERSON_TERMS = [
  "私", "僕", "俺", "当方", "自分", "筆者", "我々", "わし", "小生",
  "(?<![A-Za-z0-9_/.-])I(?![A-Za-z0-9_/.-])",
  "(?<![A-Za-z0-9_/.-])we(?![A-Za-z0-9_/.-])",
  "(?<![A-Za-z0-9_/.-])my(?![A-Za-z0-9_/.-])",
  "(?<![A-Za-z0-9_/.-])our(?![A-Za-z0-9_/.-])",
  "(?<![A-Za-z0-9_/.-])me(?![A-Za-z0-9_/.-])",
  "(?<![A-Za-z0-9_/.-])us(?![A-Za-z0-9_/.-])"
];

const DEMONSTRATIVE_TERMS = [
  "これ", "それ", "あれ", "この", "その", "あの", "同氏", "同社", "同省", "前述", "前文",
  "\\bthis\\b", "\\bthat\\b", "\\bthese\\b", "\\bthose\\b", "\\bit\\b", "\\bthey\\b"
];

const PROPER_NOUN_PATTERNS = [
  "[A-Z][a-zA-Z0-9_-]+",
  "[ァ-ンヴー]{2,}",
  "(?:開発|チーム|コミュニケーション|処理|メリット|機能|システム|設定|コンテナ|コード|技術|概要|記事|背景|課題|問題|対応|結果|提案|導入)"
];

export class SymbolPass {
  constructor() {
    this._firstPersonRes = FIRST_PERSON_TERMS.map(p => new RegExp(p, 'gi'));
    this._properNounRes = PROPER_NOUN_PATTERNS.map(p => new RegExp(p, 'g'));
    this._demonstrativeRes = DEMONSTRATIVE_TERMS.map(p => new RegExp(p, 'gi'));
  }

  get name() {
    return 'SymbolPass';
  }

  execute(ast, symTable) {
    const paragraphNodes = ast.get_nodes_by_type(NodeType.PARAGRAPH);
    const establishedEntities = new Set();

    for (let pIdx = 0; pIdx < paragraphNodes.length; pIdx++) {
      const pNode = paragraphNodes[pIdx];
      const pText = pNode.raw_text;

      // 1. First-person references
      for (const r of this._firstPersonRes) {
        const m = pText.match(r);
        if (m) {
          const matchedStr = m[0];
          symTable.add_symbol(matchedStr, 'FIRST_PERSON', pNode.node_id, EntityScope.GLOBAL, false);
          establishedEntities.add(matchedStr);
        }
      }

      // 2. Proper Nouns & Noun Entities
      for (const r of this._properNounRes) {
        const matches = pText.match(r);
        if (matches) {
          for (const match of matches) {
            if (["I", "we", "my", "our", "me", "us", "I/O"].includes(match)) continue;
            symTable.add_symbol(match, 'PROPN', pNode.node_id, EntityScope.GLOBAL, false);
            establishedEntities.add(match);
          }
        }
      }

      // 3. Demonstratives & Unresolved/Implicit References
      for (const r of this._demonstrativeRes) {
        const m = pText.match(r);
        if (m) {
          const dTerm = m[0];
          const isImplicit = establishedEntities.size === 0;
          symTable.add_symbol(dTerm, 'DEMONSTRATIVE', pNode.node_id, EntityScope.PARAGRAPH, isImplicit);
          if (isImplicit) {
            symTable.unresolved_references_count += 1;
          }
        }
      }
    }

    const totalSymbols = Object.keys(symTable.symbols).length;
    const firstPersonCount = Object.values(symTable.symbols).filter(s => s.entity_type === 'FIRST_PERSON').length;
    const implicitRatio = totalSymbols > 0 ? symTable.unresolved_references_count / totalSymbols : 0.0;

    return {
      total_symbols: totalSymbols,
      first_person_count: firstPersonCount,
      unresolved_references_count: symTable.unresolved_references_count,
      implicit_ratio: Number(implicitRatio.toFixed(4))
    };
  }
}
