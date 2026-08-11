---
name: tanuki-illust-pipeline-multica
description: "Use when generating anime illustrations or English image prompts for Tanuki-chan in Sea Cafe. Automates story analysis, scene extraction, prompt synthesis, and preview image generation."
---

# Tanuki Illust Pipeline (たぬきちゃんイラスト自動生成スキル)

本スキルは、任意のストーリー文章とキャラクターシートを入力とし、LLMによる世界観解析・名シーン抽出・英語プロンプト合成・画像生成AI連携を一括で行う自動化ツールです。

---

## 📁 スキル構成

- **`SKILL.md`**: 本スキル定義ファイル
- **`pipeline.py`**: ストーリー受取からプロンプト合成までを実行する統合メインパイプライン
- **`prompt_builder.py`**: キャラシート情報とシーンパラメータを統合するプロンプト合成エンジン
- **`character_sheet.json`**: たぬきちゃんの容姿・衣装・Sea Cafe世界観・アートスタイル固定タグシート

---

## 🚀 使い方 (Usage)

### 1. CLI / スクリプトからの実行

```bash
python3 .agents/skills/tanuki-illust-pipeline/pipeline.py
```

### 2. Pythonコードからの呼び出し

```python
from tanuki_illust_pipeline.pipeline import TanukiIllustPipeline

pipeline = TanukiIllustPipeline()

story_text = """
海風が心地よい午後のSea Cafe。
たぬきちゃんは出来立ての特製パフェを丁寧に運びながら、
「ご主人様、お待たせいたしましたの！」と元気いっぱいの笑顔を向けた。
"""

result = pipeline.process_story(story_text, scene_title="特製パフェのお届け")

print("Positive Prompt:")
print(result["positive_prompt"])
print("\nNegative Prompt:")
print(result["negative_prompt"])
```

---

## 🎨 プロンプト合成規則

1. **Character Base**: `1girl, tanuki ears, fluffy tanuki tail, short brown hair, warm brown eyes, cute anime girl, white blouse, dark navy cafe apron with bear emblem`
2. **Action & Expression**: ストーリーから抽出された動作・ポーズ・感情表現
3. **Environment & Setting**: Sea Cafeテラス、石畳、地中海風建築、ターコイズブルーの海、晴天
4. **Art Style**: `masterpiece quality anime illustration, Studio Ghibli and Makoto Shinkai aesthetic, vibrant colors, soft cinematic lighting`
