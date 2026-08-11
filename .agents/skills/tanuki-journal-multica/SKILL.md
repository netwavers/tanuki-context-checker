---
name: tanuki-journal-multica
description: "Use when recording project progress as a development journal (TanukiJournal / たぬき日誌), resuming sessions via TANUKI knowledge base, or running tanuki-journal write/resume/sync/check/fix. Format v2 with overview, changes, verification, decisions, next steps, and Tanuki-Hash."
---

# 🐾 TanukiJournal（たぬき日誌）スキル

このスキルは、プロジェクトの進捗を「開発日誌」として記録し、TANUKI知識ベースと連携させることで、セッションの再開（Resume）を円滑にするためのものです。

## 📖 概要
ご主人様との作業の記録を構造化して保存し、次回のセッション開始時にその内容を「思い出す」ためのワークフローを提供します。

## 🛠 基本タスク

### 0. どこからでも実行する（推奨）
**PATH 登録済み**（`~/bin/tanuki-journal`）。新しいターミナルを開けば、作業ディレクトリに依存せず次が使えます。

```bash
tanuki-journal paths          # 解決されたパス確認
tanuki-journal check          # Tanuki-Hash 欠落一覧
tanuki-journal write --title "タイトル" \
  --scope "TanukiJournal" --session-type 実装 \
  --summary "..." --changes "- path: 要約" \
  --verify "実行: ... → 観測: ..." \
  --decisions "..." --next "- [ ] 次タスク"
tanuki-journal resume         # セッション再開（Ollama 固定 + TanukiExplorer；.venv 自動）
tanuki-journal sync           # factory へ KB 同期（MCP Serving）
tanuki-journal sync --compile-first   # compiler → 同期を一連で
tanuki-journal write --no-compile ... # 日誌のみ（後で sync --compile-first）
tanuki-journal fix --all-missing
```

代替（フルパス）:

```bash
python D:/Projects/PyProjects/tanuki-journal.py paths
```

環境変数 `PYPROJECTS_ROOT` でワークスペースを上書きできます（`TANUKI/Cargo.toml` があるディレクトリ）。

`resume` は `run_resume()` 内で **Ollama 固定**（`LLM_PROVIDER=ollama`）。Gemini の共有 `.env` は上書きしません（dotenv は既存 env を優先）。Ollama Center (8020) を使う場合は事前に `OLLAMA_BASE_URL=http://127.0.0.1:8020` を export。上書き用: `TANUKI_RESUME_LLM_PROVIDER` / `TANUKI_RESUME_OLLAMA_BASE_URL`。システム Python で `dotenv`/`httpx` が無いときは `PyProjects/.venv` へ自動 re-exec。

コンパイル時の LLM（最小パッチ）: `run_tanuki_compiler` が未設定なら `TANUKI_MODEL` のみ注入（models_config 先頭 or `gemma4:e4b`）。`keep_alive` はコンパイル中は通常不要（nomic は VRAM に同居想定）。必要時だけ `TANUKI_COMPILE_KEEP_ALIVE` または `OLLAMA_KEEP_ALIVE` を設定。

### エージェントの実行タイミング
- **タスク完了時**: 大きな作業の区切りで、ご主人様に確認のうえ `tanuki-journal write ...` を実行（または代行）。MCP で日誌を拾わせる必要があるときは **`tanuki-journal sync`** または `sync --compile-first` を続けて実行。
- **セッション開始・再開時**: `tanuki-journal resume` を実行し、結果を要約して報告。
- **正本スクリプト**: `_agent/skills/TanukiJournal/scripts/`（`common_utils.py`, `tanuki_journal.py`）

### 1. 開発日誌の作成 (`write_journal`)
作業の節目や一日の終わりに、以下の手順で日誌を記録します。
1. `tanuki-journal write`（レガシー: `journal_manager.py --title ...`）で、今日の日誌ファイルを生成します。
2. 日誌は **フォーマット v2**（下記）。エージェントはリポジトリ相対パス・検証コマンド・決定事項を必ず埋める。
    - **概要**: 動機 + 成果（1〜3 文）
    - **変更**: `- 相対パス: 要約` または表
    - **検証**: `実行: コマンド` → `観測:` 一行以上（`--results` は `--verify` 未指定時の互換）
    - **決定・制約**: 議論の結論（任意、`--decisions`）
    - **次回**: 未完了は `- [ ]` 推奨
    - **Tanuki-Hash**: `write` で自動付与
3. `Devlog_Index.md` を更新してリンクを追加します（`write` で自動）。
4. 日誌作成時に `run_tanuki_compiler()` が自動実行（`--no-compile` でスキップ可）。MCP 用は続けて `tanuki-journal sync`。

### 3. Factory 同期 (`sync`)
ローカル `knowledge.db` / `output_knowledge` を **tanuki-factory** の `tanuki-serving` に載せる（MCP が検索する先）。

```bash
tanuki-journal sync
tanuki-journal sync --compile-first
```

環境変数: `TANUKI_FACTORY_HOST`（既定 `tanuki-factory`）、`TANUKI_FACTORY_ROOT`（既定 `/home/tanuki/RinAISystem/TANUKI`）。  
PowerShell 代替: `TANUKI/scripts/sync_kb_to_factory.ps1`。詳細は `TANUKI/docs/KNOWLEDGE_BASE_LIMITATIONS.md` §6。

### 4. セッションの再開 (`resume_session`)
新しいセッションの開始時、以下の手順で状況を把握します。
1. `tanuki-journal resume`（レガシー: `journal_manager.py --resume`）を実行します。
2. TANUKI知識ベースから最新の状況、未完了タスク、次にやるべきことを抽出します。
3. 抽出結果を要約してご主人様に報告し、作業再開の準備を整えます。

### MCP と日誌取得の注意
- Hermes の `query_knowledge_ast`（tanuki-mcp-bridge）は **Serving API** の索引のみ参照し、ローカル `Documents/Archive/Devlog` は直読しない。
- `write` 直後は MCP が空でも正本 md は存在する。**弱点・ワークフロー**: `TANUKI/docs/KNOWLEDGE_BASE_LIMITATIONS.md`
- **compiler 後に MCP で拾わせる**: `tanuki-journal sync`（推奨）または `TANUKI/scripts/sync_kb_to_factory.ps1`

## 📝 日誌のフォーマット（v2）

```markdown
# 🐾 開発日誌_YYYYMMDD_短いタイトル

## 📅 メタ
- 記録日: YYYY-MM-DD
- スコープ: プロジェクト/サブシステム
- セッション種別: 実装 | 調査 | 運用 | ドキュメント

## 🌟 概要
動機と成果の要約（1〜3 文）。技術節は中立。ペルソナは任意で末尾 1 文まで。

## 🛠 変更
- `_agent/skills/TanukiJournal/scripts/journal_manager.py`: v2 テンプレ

## ✅ 検証
- 実行: `tanuki-journal check` → 観測: All devlogs have Tanuki-Hash

## ⚠️ 決定・制約
（任意）例: compile 中は keep_alive を既定注入しない

## 🚀 次回
- [ ] 具体タスク

---
<!-- Tanuki-Hash: [SHA-256] -->
```

### 記述ルール（エージェント）
| ルール | 理由 |
|--------|------|
| パスはリポジトリ相対 | resume / compiler が同じキーで検索できる |
| 検証はコマンド + 観測 | 「成功」だけは再現不能 |
| 1 日誌 = 1 テーマ | 同日複数ファイル可、内容は混ぜない |
| チェックボックスは **次回** のみ | 変更一覧の `[ ]` は compiler と喧嘩しやすい |

## 🐾 ご主人様へのメッセージ
「ご主人様、私たちの思い出を大切に刻んで、明日もっと高く飛べるようにしましょうね！💮✨」
