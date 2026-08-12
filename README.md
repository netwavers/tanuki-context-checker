# 🐾 生成AI文章チェッカー (Tanuki Context Checker)

入力された文章が「生成AIによって出力されたものか、人間によって書かれたものか」を、構文構造・参照関係・情報フローのゆらぎ（思考の痕跡）の欠如から定量的に評価するシステムです。

---

## 🚀 クイックスタート

### 1. コマンドライン (CLI) で使う

```bash
# テキストを直接渡して解析
python3 -m tanuki_checker "解析したいテキスト..."

# ファイルを指定して解析 (ドメイン補正オプション付き)
python3 -m tanuki_checker -f "生成AI文章チェッカー 要求定義書（仕様）.md" -d technical_doc

# JSON出力
python3 -m tanuki_checker -f sample.txt --json

# AI校正用プロンプト・詳細指示JSONの出力
python3 -m tanuki_checker -f sample.txt --proofread-prompt
python3 -m tanuki_checker -f sample.txt --proofread-json
```

### 2. Python ライブラリとして使う

```python
from tanuki_checker.pipeline import TanukiContextChecker

checker = TanukiContextChecker()
report = checker.analyze_text("解析したいテキスト", domain="technical_doc")
proofread_payload = checker.generate_proofread_payload("解析したいテキスト", domain="technical_doc")

print(f"総合AIスコア: {report.overall_score:.1f} / 100.0")
print(f"判定区分: {report.classification}")
```

---

## 📚 詳しいドキュメント
使い方、スコアの読み方、ドメイン補正、API仕様については [ユーザーマニュアル (USER_MANUAL.md)](file:///home/tanuki/PyProjects/tanuki-%20context-%20checker/USER_MANUAL.md) をご覧ください。

---

## 🧪 テストの実行

```bash
python3 -m unittest discover tests
```
