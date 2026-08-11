import test from 'node:test';
import assert from 'node:assert/strict';
import { TanukiContextChecker } from '../src/analyzer/pipeline.js';

test('WebUI Pipeline Integration Test - Real-time Analysis & Domain Correction', () => {
  const checker = new TanukiContextChecker();

  // Test 1: Essay sample
  const essayText = `昨日の夜、ふと思い立って昔買った古い真空管アンプの電源を入れてみた。
最初はジーというハムノイズしか聞こえなくて、「ああ、またコンデンサが飛んだか…」と落胆したのだが、10分ほど放置していたら突然、昔聴き込んだビル・エヴァンスのピアノが実に温かみのある音で響き始めたのだった。
いや、正確にはエヴァンスではなくマイルス・デイヴィスの『Kind of Blue』だったかもしれない。とにかく、その瞬間の部屋の空気の変化には妙に感動してしまった。

デジタルオーディオの利便性には勝てないし、サブスクで数百万曲が聴ける時代にわざわざ暖機運転が必要な機械を使うなんて効率の極みから遠く離れている。だけど、こういう無駄な時間とか、予期せぬノイズの混入こそが、私にとっては音楽を聴く体験そのものなのだと思う。
最近の仕事でも同じことを感じる。すべてを効率化し、AIで最適化されたコードを書くのは確かに気持ちいい。だが、ふとしたバグ調査の途中で脱線してオープンソースのソースコードを読みふけってしまう、あの寄り道にこそエンジニアとしての面白さが詰まっているのではないだろうか。`;

  const essayReport = checker.analyzeText(essayText, 'essay', 'essay_test');
  assert.equal(essayReport.classification, 'HUMAN_FLUCTUATION_STRONG');
  assert.ok(essayReport.overall_score < 30.0);
  assert.ok(essayReport.evidence_explanations.length > 0);

  // Test 2: AI Blog sample
  const aiBlogText = `## Pythonにおける非同期処理（asyncio）の基本概念と活用法

近年、Webアプリケーションの高性能化やマイクロサービス化に伴い、非同期処理の重要性が高まっています。Pythonでは \`asyncio\` ライブラリを使用することで、シングルスレッドでありながら効率的なI/O多重化を実現することが可能です。

### 非同期処理の主なメリット
非同期処理を導入することにより、以下のメリットを享受することができます。

1. **レスポンスタイムの向上**: I/O待ち時間中に他のタスクを実行できるため、全体処理時間を短縮できます。
2. **リソース消費の削減**: スレッドを大量に生成する必要がないため、メモリ使用量を抑えられます。
3. **スケーラビリティの確保**: C10K問題に対処し、多数の同時接続をスムーズに処理可能です。

### まとめ
本記事では、Pythonの \`asyncio\` の基本概念と利点について解説しました。適切なユースケースで非同期処理を活用することにより、システムのパフォーマンスを極大化させることができるでしょう。是非プロジェクトへの導入をご検討ください。`;

  const aiBlogReport = checker.analyzeText(aiBlogText, 'blog', 'ai_blog_test');
  assert.equal(aiBlogReport.classification, 'AI_HOMOGENEOUS_HIGH');
  assert.ok(aiBlogReport.overall_score > 70.0);

  // Test 3: Technical Doc sample with domain compensation
  const specText = `# システム間同期API インターフェース仕様書

## 概要
本仕様書は、基幹基盤システムと店舗端末（ParticipationManager）との間で顧客滞在データをリアルタイム同期するためのRESTful API仕様を定義する。

## エンドポイント定義
POST /api/v1/sync/stay-events

### リクエストヘッダー
- Content-Type: application/json
- Authorization: Bearer <JWT_TOKEN>
- X-Client-ID: string (必須)

### ペイロード仕様
リクエストボディは以下のフィールドを含むJSONオブジェクトでなければならない。
1. \`device_id\` (string, 必須): 店舗端末の識別ID。
2. \`timestamp\` (integer, 必須): Unixエポックミリ秒。
3. \`events\` (array, 必須): イベントオブジェクトの配列。

## エラーハンドリング方針
認証エラーが発生した場合は HTTP 401 Unauthorized を返却する。バリデーションエラーの場合は HTTP 400 Bad Request を返し、レスポンスボディの \`details\` 配列に詳細コードを格納すること。`;

  const specReport = checker.analyzeText(specText, 'technical_doc', 'spec_test');
  assert.ok(specReport.evidence_explanations.some(e => e.includes('ドメイン補正 (technical_doc)')));
  assert.ok(specReport.overall_score < 70.0);

  console.log('✅ Component & Pipeline Integration Tests Passed Successfully!');
});
