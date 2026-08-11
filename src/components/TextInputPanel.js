export const SAMPLE_TEXTS = {
  essay: {
    domain: 'essay',
    title: '人間エッセイ (ゆらぎ強)',
    text: `昨日の夜、ふと思い立って昔買った古い真空管アンプの電源を入れてみた。
最初はジーというハムノイズしか聞こえなくて、「ああ、またコンデンサが飛んだか…」と落胆したのだが、10分ほど放置していたら突然、昔聴き込んだビル・エヴァンスのピアノが実に温かみのある音で響き始めたのだった。
いや、正確にはエヴァンスではなくマイルス・デイヴィスの『Kind of Blue』だったかもしれない。とにかく、その瞬間の部屋の空気の変化には妙に感動してしまった。

デジタルオーディオの利便性には勝てないし、サブスクで数百万曲が聴ける時代にわざわざ暖機運転が必要な機械を使うなんて効率の極みから遠く離れている。だけど、こういう無駄な時間とか、予期せぬノイズの混入こそが、私にとっては音楽を聴く体験そのものなのだと思う。
最近の仕事でも同じことを感じる。すべてを効率化し、AIで最適化されたコードを書くのは確かに気持ちいい。だが、ふとしたバグ調査の途中で脱線してオープンソースのソースコードを読みふけってしまう、あの寄り道にこそエンジニアとしての面白さが詰まっているのではないだろうか。`
  },
  ai_blog: {
    domain: 'blog',
    title: 'AI生成ブログ (均質化高)',
    text: `## Pythonにおける非同期処理（asyncio）の基本概念と活用法

近年、Webアプリケーションの高性能化やマイクロサービス化に伴い、非同期処理の重要性が高まっています。Pythonでは \`asyncio\` ライブラリを使用することで、シングルスレッドでありながら効率的なI/O多重化を実現することが可能です。

### 非同期処理の主なメリット
非同期処理を導入することにより、以下のメリットを享受することができます。

1. **レスポンスタイムの向上**: I/O待ち時間中に他のタスクを実行できるため、全体処理時間を短縮できます。
2. **リソース消費の削減**: スレッドを大量に生成する必要がないため、メモリ使用量を抑えられます。
3. **スケーラビリティの確保**: C10K問題に対処し、多数の同時接続をスムーズに処理可能です。

### まとめ
本記事では、Pythonの \`asyncio\` の基本概念と利点について解説しました。適切なユースケースで非同期処理を活用することにより、システムのパフォーマンスを極大化させることができるでしょう。是非プロジェクトへの導入をご検討ください。`
  },
  spec: {
    domain: 'technical_doc',
    title: '技術仕様書 (ドメイン補正対象)',
    text: `# システム間同期API インターフェース仕様書

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
認証エラーが発生した場合は HTTP 401 Unauthorized を返却する。バリデーションエラーの場合は HTTP 400 Bad Request を返し、レスポンスボディの \`details\` 配列に詳細コードを格納すること。`
  },
  short: {
    domain: 'blog',
    title: '短文サンプル (<100文字)',
    text: `AI文章チェッカーのテスト短文です。これは短すぎるテキストの挙動を検証するためのサンプルです。`
  }
};

export class TextInputPanelComponent {
  constructor(container, { onInputText, onSelectSample }) {
    this.container = container;
    this.onInputText = onInputText;
    this.onSelectSample = onSelectSample;
    this.debounceTimer = null;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="glass-panel text-input-panel">
        <div class="panel-header">
          <div class="panel-title">
            <span>📝 解析テキスト入力</span>
          </div>
          <div class="sample-buttons-group">
            <button class="sample-btn" data-sample="essay">☕ 人間エッセイ</button>
            <button class="sample-btn" data-sample="ai_blog">🤖 AI生成ブログ</button>
            <button class="sample-btn" data-sample="spec">📑 技術仕様書</button>
            <button class="sample-btn" data-sample="short">⚡ 短文テスト</button>
          </div>
        </div>

        <div class="textarea-wrapper">
          <textarea
            id="analysisTextarea"
            class="input-textarea"
            placeholder="解析したいテキスト（文章・記事・レポート等）を入力してください... (300msリアルタイム解析対応)"
          ></textarea>
        </div>

        <div class="textarea-footer">
          <div class="char-counter" id="charCounter">0 文字</div>
          <div class="status-indicator" id="statusIndicator">入力待ち</div>
        </div>

        <div class="panel-actions">
          <button class="btn-secondary" id="clearBtn">🗑 クリア</button>
          <button class="btn-primary" id="analyzeBtn">🔍 今すぐ解析実行</button>
        </div>
      </div>
    `;

    this.textarea = this.container.querySelector('#analysisTextarea');
    this.charCounter = this.container.querySelector('#charCounter');
    this.statusIndicator = this.container.querySelector('#statusIndicator');
    this.clearBtn = this.container.querySelector('#clearBtn');
    this.analyzeBtn = this.container.querySelector('#analyzeBtn');

    // Event Listeners
    this.textarea.addEventListener('input', () => {
      this.updateCharCounter();
      this.triggerDebouncedInput();
    });

    this.clearBtn.addEventListener('click', () => {
      this.textarea.value = '';
      this.updateCharCounter();
      if (typeof this.onInputText === 'function') {
        this.onInputText('');
      }
    });

    this.analyzeBtn.addEventListener('click', () => {
      if (typeof this.onInputText === 'function') {
        this.onInputText(this.textarea.value);
      }
    });

    const sampleBtns = this.container.querySelectorAll('.sample-btn');
    sampleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const sampleKey = btn.getAttribute('data-sample');
        const sampleData = SAMPLE_TEXTS[sampleKey];
        if (sampleData) {
          this.textarea.value = sampleData.text;
          this.updateCharCounter();
          if (typeof this.onSelectSample === 'function') {
            this.onSelectSample(sampleData);
          }
        }
      });
    });
  }

  updateCharCounter() {
    const len = this.textarea.value.trim().length;
    this.charCounter.textContent = `${len} 文字`;
    if (len === 0) {
      this.charCounter.className = 'char-counter';
      this.statusIndicator.textContent = '入力待ち';
    } else if (len < 100) {
      this.charCounter.className = 'char-counter warning';
      this.statusIndicator.textContent = '⚠️ 100文字未満（信頼度制限あり）';
    } else {
      this.charCounter.className = 'char-counter valid';
      this.statusIndicator.textContent = '✅ 解析可能';
    }
  }

  triggerDebouncedInput() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      if (typeof this.onInputText === 'function') {
        this.onInputText(this.textarea.value);
      }
    }, 300);
  }

  setText(text) {
    this.textarea.value = text;
    this.updateCharCounter();
  }

  getText() {
    return this.textarea.value;
  }
}
