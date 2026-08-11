"""
Corpus Dataset Builder Script for Tanuki Context Checker.
Generates evaluation_corpus.json and validates it against dataset_schema.py.
"""

import json
from pathlib import Path
from dataset_schema import (
    CorpusDataset,
    CorpusSample,
    DomainBaselineConfig,
    DomainType,
    AuthorType,
    ClassificationLabel,
    ExpectedScoreBand,
    ExpectedLayerScores,
    QualitativeFeatures,
)


def create_corpus_dataset() -> CorpusDataset:
    domain_baselines = {
        "technical_doc": DomainBaselineConfig(
            domain=DomainType.TECHNICAL_DOC,
            bias_term=-0.35,
            correction_factor=0.85,
            expected_structural_weight_modifier=0.40,
            description="仕様書・技術設計書。意図的な構造化を許容し偽陽性を抑止。"
        ),
        "academic_paper": DomainBaselineConfig(
            domain=DomainType.ACADEMIC_PAPER,
            bias_term=-0.40,
            correction_factor=0.90,
            expected_structural_weight_modifier=0.30,
            description="学術論文。文法の厳密性と受動態定型文を考慮。"
        ),
        "report": DomainBaselineConfig(
            domain=DomainType.REPORT,
            bias_term=-0.15,
            correction_factor=0.60,
            expected_structural_weight_modifier=0.65,
            description="業務・調査レポート。中程度の構造化を考慮。"
        ),
        "blog": DomainBaselineConfig(
            domain=DomainType.BLOG,
            bias_term=0.00,
            correction_factor=0.40,
            expected_structural_weight_modifier=0.80,
            description="技術・個人ブログ。一定の口語と個人の経験談を期待。"
        ),
        "essay": DomainBaselineConfig(
            domain=DomainType.ESSAY,
            bias_term=0.10,
            correction_factor=0.20,
            expected_structural_weight_modifier=1.00,
            description="散文・雑記・エッセイ。ゆらぎの欠如を強力にペナルティ判定。"
        ),
    }

    samples = []

    # 1. HUMAN SAMPLE 001 - Essay (Strong Human Fluctuation)
    text_h1 = (
        "昨日の夜、ふと思い立って昔買った古い真空管アンプの電源を入れてみた。\n"
        "最初はジーというハムノイズしか聞こえなくて、「ああ、またコンデンサが飛んだか…」と落胆したのだが、"
        "10分ほど放置していたら突然、昔聴き込んだビル・エヴァンスのピアノが実に温かみのある音で響き始めたのだった。\n"
        "いや、正確にはエヴァンスではなくマイルス・デイヴィスの『Kind of Blue』だったかもしれない。"
        "とにかく、その瞬間の部屋の空気の変化には妙に感動してしまった。\n\n"
        "デジタルオーディオの利便性には勝てないし、サブスクで数百万曲が聴ける時代にわざわざ暖機運転が必要な機械を使うなんて効率の極みから遠く離れている。"
        "だけど、こういう無駄な時間とか、予期せぬノイズの混入こそが、私にとっては音楽を聴く体験そのものなのだと思う。\n"
        "最近の仕事でも同じことを感じる。すべてを効率化し、AIで最適化されたコードを書くのは確かに気持ちいい。"
        "だが、ふとしたバグ調査の途中で脱線してオープンソースのソースコードを読みふけってしまう、あの寄り道にこそエンジニアとしての面白さが詰まっているのではないだろうか。"
    )
    samples.append(
        CorpusSample(
            sample_id="SAMPLE-HUMAN-ESSAY-001",
            title="古い真空管アンプとエンジニアの寄り道（雑記・エッセイ）",
            text=text_h1,
            domain=DomainType.ESSAY,
            author_type=AuthorType.HUMAN,
            prompt_type=None,
            char_count=len(text_h1),
            expected_score_band=ExpectedScoreBand(
                min_score=5.0,
                max_score=25.0,
                target_classification=ClassificationLabel.HUMAN_FLUCTUATION_STRONG,
            ),
            expected_layer_scores=ExpectedLayerScores(
                surface=0.05,
                lexical=0.10,
                structural=0.15,
                flow=0.10,
            ),
            qualitative_features=QualitativeFeatures(
                has_first_person=True,
                has_self_correction=True,
                has_topic_jump=True,
                has_markdown_artifact=False,
                has_ai_phrases=False,
                unresolved_references_count=2,
            ),
            evidence_notes=[
                "「いや、正確には〜だったかもしれない」という明確な思考の軌道修正・言い換えが存在する。",
                "真空管アンプの思い出からソフトウェアエンジニアリングへの意図的な脱線・価値観のジャンプが見られる。",
                "一人称（私、僕）と個人的な体験談（ビル・エヴァンス、Kind of Blue）が具体的に記述されている。",
                "段落長および文長の分散が極めて大きく、定型的な文章構造に収まっていない。"
            ],
        )
    )

    # 2. HUMAN SAMPLE 002 - Tech Blog / Troubleshooting Experience
    text_h2 = (
        "Docker Desktopをバージョンアップしたら、突然ローカルのPostgreSQLコンテナが起動しなくなったハマりメモ。\n\n"
        "結論から言うと、`docker-compose.yml` でマウントしていたボリュームのパーミッションが、新しいEngineの仕様変更で書き換え不可になっていたのが原因だった。"
        "最初ログを見ても `FATAL: data directory \"/var/lib/postgresql/data\" has wrong ownership` としか出ていなくて、"
        "「いや昨日まで動いてただろ！」と深夜に一人で画面に向かって叫んでしまった（笑）。\n\n"
        "試したこと：\n"
        "- コンテナの再起動（当然ダメ）\n"
        "- イメージの再プル（意味なし）\n"
        "- ディレクトリの `chmod 777`（行儀悪いけど背に腹は代えられない）\n\n"
        "最終的には、GitHubのIssueを漁っていたら全く同じ症状に遭っているブラジル人のエンジニアを見つけて、"
        "彼が提示していた `bind mounts` のフラグ変更を行ったら一発で治った。"
        "公式ドキュメントの破壊的変更のページにはこの挙動が載っていなくて、マジで3時間無駄にしたわ…。"
        "同じ現象でハマっている人のために一応メモを残しておく。"
    )
    samples.append(
        CorpusSample(
            sample_id="SAMPLE-HUMAN-BLOG-002",
            title="Docker Desktopアップデート後のPostgres起動エラーハマり日記",
            text=text_h2,
            domain=DomainType.BLOG,
            author_type=AuthorType.HUMAN,
            prompt_type=None,
            char_count=len(text_h2),
            expected_score_band=ExpectedScoreBand(
                min_score=10.0,
                max_score=28.0,
                target_classification=ClassificationLabel.HUMAN_FLUCTUATION_STRONG,
            ),
            expected_layer_scores=ExpectedLayerScores(
                surface=0.10,
                lexical=0.15,
                structural=0.20,
                flow=0.12,
            ),
            qualitative_features=QualitativeFeatures(
                has_first_person=True,
                has_self_correction=True,
                has_topic_jump=False,
                has_markdown_artifact=False,
                has_ai_phrases=False,
                unresolved_references_count=1,
            ),
            evidence_notes=[
                "感情的吐露（「マジで3時間無駄にしたわ…」「（笑）」）や口語表現が含まれる。",
                "試行錯誤の過程（ダメだった対応策）の不均一な箇条書きが含まれる。",
                "ブラジル人エンジニアのGitHub Issueといった具体的で偶発的なエピソードが提示されている。"
            ],
        )
    )

    # 3. HUMAN SAMPLE 003 - Technical Spec (Needs Domain Correction)
    text_h3 = (
        "# システム間同期API インターフェース仕様書\n\n"
        "## 概要\n"
        "本仕様書は、基幹基盤システムと店舗端末（ParticipationManager）との間で顧客滞在データをリアルタイム同期するためのRESTful API仕様を定義する。\n\n"
        "## エンドポイント定義\n"
        "POST /api/v1/sync/stay-events\n\n"
        "### リクエストヘッダー\n"
        "- Content-Type: application/json\n"
        "- Authorization: Bearer <JWT_TOKEN>\n"
        "- X-Client-ID: string (必須)\n\n"
        "### ペイロード仕様\n"
        "リクエストボディは以下のフィールドを含むJSONオブジェクトでなければならない。\n"
        "1. `device_id` (string, 必須): 店舗端末の識別ID。\n"
        "2. `timestamp` (integer, 必須): Unixエポックミリ秒。\n"
        "3. `events` (array, 必須): イベントオブジェクトの配列。\n\n"
        "## エラーハンドリング方針\n"
        "認証エラーが発生した場合は HTTP 401 Unauthorized を返却する。"
        "バリデーションエラーの場合は HTTP 400 Bad Request を返し、レスポンスボディの `details` 配列に詳細コードを格納すること。"
    )
    samples.append(
        CorpusSample(
            sample_id="SAMPLE-HUMAN-SPEC-003",
            title="人間が執筆した正規のシステム仕様書（要ドメイン補正）",
            text=text_h3,
            domain=DomainType.TECHNICAL_DOC,
            author_type=AuthorType.HUMAN,
            prompt_type=None,
            char_count=len(text_h3),
            expected_score_band=ExpectedScoreBand(
                min_score=15.0,
                max_score=35.0,
                target_classification=ClassificationLabel.HUMAN_FLUCTUATION_STRONG,
            ),
            expected_layer_scores=ExpectedLayerScores(
                surface=0.05,
                lexical=0.25,
                structural=0.75,  # 高い構造一様性（人間が意図的に整えたため）
                flow=0.30,
            ),
            qualitative_features=QualitativeFeatures(
                has_first_person=False,
                has_self_correction=False,
                has_topic_jump=False,
                has_markdown_artifact=False,
                has_ai_phrases=False,
                unresolved_references_count=0,
            ),
            evidence_notes=[
                "人間が執筆した仕様書であり、意図的に見出し・リスト構造が均一に整えられている。",
                "ドメイン補正 (technical_doc) が適用されない場合、構造スコアが高くなり誤判定（偽陽性）のリスクがある。",
                "AI頻出テンプレート表現（「徹底解説」等）やAI消し忘れMarkdownは含まれない。"
            ],
        )
    )

    # 4. AI SAMPLE 001 - GPT-4o Standard Output (High Homogeneity)
    text_ai1 = (
        "## Pythonにおける非同期処理（asyncio）の基本概念と活用法\n\n"
        "近年、Webアプリケーションの高性能化やマイクロサービス化に伴い、非同期処理の重要性が高まっています。"
        "Pythonでは `asyncio` ライブラリを使用することで、シングルスレッドでありながら効率的なI/O多重化を実現することが可能です。\n\n"
        "### 非同期処理の主なメリット\n"
        "非同期処理を導入することにより、以下のメリットを享受することができます。\n\n"
        "1. **レスポンスタイムの向上**: I/O待ち時間中に他のタスクを実行できるため、全体処理時間を短縮できます。\n"
        "2. **リソース消費の削減**: スレッドを大量に生成する必要がないため、メモリ使用量を抑えられます。\n"
        "3. **スケーラビリティの確保**: C10K問題に対処し、多数の同時接続をスムーズに処理可能です。\n\n"
        "### まとめ\n"
        "本記事では、Pythonの `asyncio` の基本概念と利点について解説しました。"
        "適切なユースケースで非同期処理を活用することにより、システムのパフォーマンスを極大化させることができるでしょう。"
        "是非プロジェクトへの導入をご検討ください。"
    )
    samples.append(
        CorpusSample(
            sample_id="SAMPLE-AI-GPT4O-001",
            title="GPT-4o標準出力：Python asyncio解説記事",
            text=text_ai1,
            domain=DomainType.BLOG,
            author_type=AuthorType.AI_GPT4O,
            prompt_type="standard_informative_prompt",
            char_count=len(text_ai1),
            expected_score_band=ExpectedScoreBand(
                min_score=78.0,
                max_score=98.0,
                target_classification=ClassificationLabel.AI_HOMOGENEOUS_HIGH,
            ),
            expected_layer_scores=ExpectedLayerScores(
                surface=0.60,
                lexical=0.85,
                structural=0.90,
                flow=0.88,
            ),
            qualitative_features=QualitativeFeatures(
                has_first_person=False,
                has_self_correction=False,
                has_topic_jump=False,
                has_markdown_artifact=False,
                has_ai_phrases=True,
                unresolved_references_count=0,
            ),
            evidence_notes=[
                "「近年〜の重要性が高まっています」「〜を享受することができます」「まとめ」「是非ご検討ください」などの典型的AIテンプレート文が満載。",
                "各箇条書きの長さ・構文（「〜の向上」「〜の削減」「〜の確保」）が極めて均一である。",
                "一人称や個人の具体的な失敗・試行錯誤のエピソードが一切存在しない。",
                "AST深さ分散および段落長CV値が著しく低い。"
            ],
        )
    )

    # 5. AI SAMPLE 002 - Claude 3.5 Sonnet Markdown Artifacts (High Homogeneity)
    text_ai2 = (
        "```markdown\n"
        "# チーム開発におけるコミュニケーション改善のための5つのアプローチ\n\n"
        "現代のソフトウェア開発において、チーム内の円滑なコミュニケーションはプロジェクトの成功に不可欠な要素です。"
        "以下に、実践的な改善アプローチをご紹介します。\n\n"
        "--- \n\n"
        "### 1. 朝会の短時間化と目的に特化した設計\n"
        "毎日のスタンドアップミーティングは15分以内に収めることが望ましいと考えられます。"
        "進捗報告に終始するのではなく、ブロッカーの早期発見に注力することが推奨されます。\n\n"
        "### 2. 心理的安全性の確保とオープンなフィードバック\n"
        "メンバーが失敗を恐れずに発言できる環境を整備することが重要です。"
        "建設的な批評を行う文化を醸成することにより、チーム全体の成果が高まります。\n\n"
        "--- \n\n"
        "ご参考になりましたら幸いです。追加のご質問や具体的な導入支援が必要な場合は、お気軽にお知らせください。\n"
        "```"
    )
    samples.append(
        CorpusSample(
            sample_id="SAMPLE-AI-CLAUDE-002",
            title="Claude 3.5 Sonnet出力（Markdown枠消し忘れ＆定型文残留）",
            text=text_ai2,
            domain=DomainType.REPORT,
            author_type=AuthorType.AI_CLAUDE35,
            prompt_type="consulting_advice_prompt",
            char_count=len(text_ai2),
            expected_score_band=ExpectedScoreBand(
                min_score=85.0,
                max_score=99.0,
                target_classification=ClassificationLabel.AI_HOMOGENEOUS_HIGH,
            ),
            expected_layer_scores=ExpectedLayerScores(
                surface=0.95,  # 消し忘れMarkdown
                lexical=0.88,
                structural=0.92,
                flow=0.90,
            ),
            qualitative_features=QualitativeFeatures(
                has_first_person=False,
                has_self_correction=False,
                has_topic_jump=False,
                has_markdown_artifact=True,
                has_ai_phrases=True,
                unresolved_references_count=0,
            ),
            evidence_notes=[
                "文頭および文末に ```markdown ... ``` のコードブロック枠消し忘れアーティファクトが残存。",
                "「ご参考になりましたら幸いです。追加のご質問が…」というメタ会話文言が末尾に残留。",
                "「〜と考えられます」「〜が推奨されます」「〜が重要です」等のヘッジ表現・受動定型句の多用。"
            ],
        )
    )

    # 6. AI SAMPLE 003 - Prompt Engineered Human Mimicry (Mixed / High AI)
    text_ai3 = (
        "ねえ、知ってる？最近のAIツールの進化ってマジでやばいよね。\n"
        "あ、そういえば昨日カフェで仕事してたら急にWi-Fiが切れて焦ったんだけど、その時にふと考えたんだ。\n"
        "結局のところ、人間が書く文章とAIが書く文章の違いってどこにあるんだろう？って。\n\n"
        "まあ、結論から言うと、AIは完璧すぎるのが弱点なのかもしれないね。"
        "人間は書きながら「やっぱりさっきの撤回！」みたいに軌道修正するけど、AIは最初から最後まで一直線に論理を組み立てちゃう。\n"
        "だからこそ、これからの時代は意図的に文章に隙を作ることが大切になってくると思うんだよね。"
        "みんなはどう思う？コメントで教えてね！"
    )
    samples.append(
        CorpusSample(
            sample_id="SAMPLE-AI-PROMPT-003",
            title="AIプロンプト模倣文（口語風・脱線指示つきAI出力）",
            text=text_ai3,
            domain=DomainType.ESSAY,
            author_type=AuthorType.AI_PROMPT_ENGINEERED,
            prompt_type="mimic_human_casual_with_tangents",
            char_count=len(text_ai3),
            expected_score_band=ExpectedScoreBand(
                min_score=45.0,
                max_score=68.0,
                target_classification=ClassificationLabel.MIXED_NEEDS_REVIEW,
            ),
            expected_layer_scores=ExpectedLayerScores(
                surface=0.20,
                lexical=0.45,
                structural=0.60,
                flow=0.55,
            ),
            qualitative_features=QualitativeFeatures(
                has_first_person=True,
                has_self_correction=False,  # 口調のみ模倣で本質的自己訂正なし
                has_topic_jump=True,        # プロンプトによる人工的脱線
                has_markdown_artifact=False,
                has_ai_phrases=False,
                unresolved_references_count=0,
            ),
            evidence_notes=[
                "プロンプト指示によって口語体（「マジでやばい」）や偽の脱線（カフェのWi-Fi）が挿入されている。",
                "表層表現は人間風を装っているが、中間論理フローや参照DFGは不自然なほど滑らかに整理されており、本質的な自己訂正や暗黙参照は欠如している。",
                "スコア帯は 30-70 の MIXED_NEEDS_REVIEW に着地し、人間レビューが必要な要判定対象となる。"
            ],
        )
    )

    # 7. SHORT SAMPLE 004 - Boundary Test (< 100 chars)
    text_short = "AI文章チェッカーのテスト短文です。これは短すぎるテキストの挙動を検証するためのサンプルです。"
    samples.append(
        CorpusSample(
            sample_id="SAMPLE-BOUNDARY-SHORT-004",
            title="短文境界テストサンプル（100文字未満）",
            text=text_short,
            domain=DomainType.BLOG,
            author_type=AuthorType.HUMAN,
            prompt_type=None,
            char_count=len(text_short),
            expected_score_band=ExpectedScoreBand(
                min_score=0.0,
                max_score=100.0,
                target_classification=ClassificationLabel.MIXED_NEEDS_REVIEW,
            ),
            expected_layer_scores=ExpectedLayerScores(
                surface=0.0,
                lexical=0.0,
                structural=0.0,
                flow=0.0,
            ),
            qualitative_features=QualitativeFeatures(
                has_first_person=False,
                has_self_correction=False,
                has_topic_jump=False,
                has_markdown_artifact=False,
                has_ai_phrases=False,
                unresolved_references_count=0,
            ),
            evidence_notes=[
                "文字数が len(text) < 100 のため、ConfidenceFlag.INSUFFICIENT_LENGTH の判定テストに利用する。",
                "解析パイプラインはスコア算出をスキップすべき対象。"
            ],
        )
    )

    return CorpusDataset(
        version="1.0.0",
        created_at="2026-08-11T06:50:00Z",
        description="Tanuki Context Checker Stage 1 Evaluation Corpus Dataset containing human samples, AI samples, technical docs, and edge cases.",
        domain_baselines=domain_baselines,
        samples=samples,
    )


def main():
    dataset = create_corpus_dataset()
    output_path = Path(__file__).parent / "evaluation_corpus.json"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(dataset.model_dump_json(indent=2))
    print(f"Successfully generated evaluation corpus dataset at: {output_path}")
    print(f"Total samples created: {len(dataset.samples)}")


if __name__ == "__main__":
    main()
