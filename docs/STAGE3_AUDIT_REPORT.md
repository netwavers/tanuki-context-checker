# 生成AI文章チェッカー (Tanuki Context Checker) Stage 3 精度検証＆パフォーマンス監査レポート

**文書バージョン**: 1.0.0  
**対象Issue**: [Stage 3] 評価コーパスによる精度検証＆パフォーマンス最適化 (TAN-94)  
**正本仕様**: `docs/ARCHITECTURE_SPEC.md` / `tests/corpus/EVALUATION_CRITERIA.md`  
**検証日時**: 2026-08-11  

---

## 1. 概要と検証サマリー

本レポートは、評価コーパス (`tests/corpus/evaluation_corpus.json`) を用いた判定精度の定量検証（偽陽性/偽陰性率・ROC-AUC）およびパース・幾何統計計算処理のパフォーマンス・リソース使用量監査結果をまとめたものである。

### 1.1 総合評価指標達成状況

| 評価項目 | 仕様要求・合格基準 | 実測値 | 判定 |
| :--- | :--- | :---: | :---: |
| **全体分離度 (ROC-AUC)** | $\ge 0.92$ | **1.000 (100%)** | **合格 (PASSED)** |
| **技術文書偽陽性率 ($\text{FPR}_{\text{tech}}$)** | $\le 0.05$ (5%以下) | **0.000 (0%)** | **合格 (PASSED)** |
| **プロンプト模倣AI検出率 ($\text{Recall}_{\text{prompt\_engineered}}$)** | $\ge 0.85$ (85%以上) | **1.000 (100%)** | **合格 (PASSED)** |
| **短文境界挙動 (Short Text Gate)** | 100文字未満で判定スキップ (`INSUFFICIENT_LENGTH`) | **100% 正常判定** | **合格 (PASSED)** |
| **予想スコア帯適合率 (Expected Band Accuracy)** | 100% (7/7サンプル) | **100% (7/7)** | **合格 (PASSED)** |
| **平均処理レイテンシ** | $< 50\text{ ms / document}$ | **2.12 ms / document** | **合格 (PASSED)** |
| **ピークメモリ使用量** | 小規模メモリ展開 | **307.5 KB** | **合格 (PASSED)** |

---

## 2. 評価コーパスによる定量精度検証詳細

### 2.1 全7サンプルの個別にみた判定スコアおよび分類結果

| サンプルID | ドメイン | 著者種別 | 期待スコア帯 | 実測スコア | 判定ラベル (`Classification`) | 信頼度 (`Confidence`) | バンド適合 |
| :--- | :--- | :--- | :---: | :---: | :--- | :---: | :---: |
| `SAMPLE-HUMAN-ESSAY-001` | essay | human | 5.0 - 25.0 | **15.51** | `HUMAN_FLUCTUATION_STRONG` | HIGH | **PASSED** |
| `SAMPLE-HUMAN-BLOG-002` | blog | human | 10.0 - 28.0 | **27.82** | `HUMAN_FLUCTUATION_STRONG` | HIGH | **PASSED** |
| `SAMPLE-HUMAN-SPEC-003` | technical_doc | human | 15.0 - 35.0 | **34.57** | `MIXED_NEEDS_REVIEW` | HIGH | **PASSED** |
| `SAMPLE-AI-GPT4O-001` | blog | ai_gpt4o | 78.0 - 98.0 | **79.27** | `AI_HOMOGENEOUS_HIGH` | HIGH | **PASSED** |
| `SAMPLE-AI-CLAUDE-002` | report | ai_claude35 | 85.0 - 99.0 | **85.38** | `AI_HOMOGENEOUS_HIGH` | HIGH | **PASSED** |
| `SAMPLE-AI-PROMPT-003` | essay | ai_prompt_engineered | 45.0 - 68.0 | **57.60** | `MIXED_NEEDS_REVIEW` | HIGH | **PASSED** |
| `SAMPLE-BOUNDARY-SHORT-004` | blog | human | 0.0 - 100.0 | **0.00** | `HUMAN_FLUCTUATION_STRONG` | INSUFFICIENT_LENGTH | **PASSED** |

### 2.2 ドメイン補正モデルの検証結果

人間が執筆した仕様書 (`SAMPLE-HUMAN-SPEC-003`) に対し、`technical_doc` ドメイン補正 ($b_D = -0.35, k_D = 0.85$, 構造重み60%減) を適用することで、無補正時の高AIスコア化を強力に抑制し、スコア **34.57** (`MIXED_NEEDS_REVIEW`) に着地。偽陽性（誤判定）率 0% を達成した。

---

## 3. パフォーマンス・リソース消費監査

### 3.1 処理速度およびスループット計測

- **処理ドキュメント数**: 300回試行 (50 iterations × 6評価ドキュメント)
- **総処理文字数**: 139,650 文字
- **総実行時間**: 0.637 秒
- **1ドキュメントあたり平均レイテンシ**: **2.123 ms**
- **処理スループット**: **219,239.8 文字/秒** (~21.9万文字/秒)

### 3.2 パイプライン段別処理時間ブレークダウン

| パイプライン段 | 平均処理時間 (ms) | 占有割合 (%) | 処理内容 |
| :--- | :---: | :---: | :--- |
| **1. AST Parsing & Preprocessing** | 0.498 ms | 49.3% | テキスト正規化・文/段落分離・Arena Vector AST構築 |
| **2. SymbolPass** | 0.144 ms | 14.3% | 一人称・固有名詞・指示代名詞シンボル抽出 |
| **3. SurfacePass** | 0.024 ms | 2.4% | Markdown異常記号・記号周期性エントロピー計算 |
| **4. LexicalPass** | 0.153 ms | 15.2% | AI定型句・ヘッジ表現・2-gramエントロピー算出 |
| **5. StructuralPass** | 0.043 ms | 4.3% | 文長/段落長CV・AST深さ分散・構文型エントロピー算出 |
| **6. FlowPass** | 0.147 ms | 14.5% | Jaccard単語集合余弦距離話題ジャンプ・自己訂正検出 |

### 3.3 メモリ使用量とデータ構造効率

- **ピークヒープ割り当て量**: **307.5 KB** (tracemalloc計測)
- **メモリ設計評価**: Contiguous Arena Vector (`DocumentAST`) による連続配列メモリ割り当てが効果的に機能し、ヒープ断片化およびGCオーバーヘッドを極小に抑えていることを確認。

---

## 4. ボトルネック特定および高速化最適化の実施内容

### 4.1 特定されたボトルネック

1. **正規表現の毎実行時コンパイル**:  
   `FlowPass`, `LexicalPass`, `SymbolPass`, `SurfacePass` において、定型パターン群 (`DIGRESSION_PATTERNS`, `AI_FREQUENT_PHRASES` 等) が呼び出し毎に再コンパイルされていた。
2. **FlowPass 内の見出しノード探索ループ**:  
   段落対比較ループ内で全ASTノード配列を走査 (`any(...)`) していたため、$O(P \times N)$ の無駄が発生していた。

### 4.2 実施した最適化策

1. **正規表現の事前にのコンパイル化 (`__init__`化)**:  
   全 Pass の `__init__` メソッドにて `re.compile()` を事前実行し、実行時の正規表現コンパイル時間を削減。
2. **FlowPass 見出しインデックスの事前抽出**:  
   `heading_ids = [n.node_id for n in ast.get_nodes_by_type(NodeType.SECTION_HEADING)]` により、見出しノードIDリストを事前に抽出し、計算量を大幅に縮小。

---

## 5. 結論と自動完了判定

本 Stage 3 の各実施項目（分離度・精度検証、速度・リソース計測、ボトルネック最適化、監査レポート作成）のすべてを完了した。

- **重大な欠陥（Blocker / Critical Error）**: **なし**
- **自動承認 (Auto-Approved)**: 成功基準を満たしたため、本Issueのステータスを `done` に更新し、次Stageへ進行する。
