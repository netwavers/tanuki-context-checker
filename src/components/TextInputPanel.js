export const SAMPLE_TEXTS = {
  essay: {
    key: 'essay',
    domain: 'essay',
    title: '人間エッセイ',
    text: `昨日の夜、ふと思い立って昔買った古い真空管アンプの電源を入れてみた。
最初はジーというハムノイズしか聞こえなくて、「ああ、またコンデンサが飛んだか…」と落胆したのだが、10分ほど放置していたら突然、昔聴き込んだビル・エヴァンスのピアノが実に温かみのある音で響き始めたのだった。
いや、正確にはエヴァンスではなくマイルス・デイヴィスの『Kind of Blue』だったかもしれない。とにかく、その瞬間の部屋の空気の変化には妙に感動してしまった。

デジタルオーディオの利便性には勝てないし、サブスクで数百万曲が聴ける時代にわざわざ暖機運転が必要な機械を使うなんて効率の極みから遠く離れている。だけど、こういう無駄な時間とか、予期せぬノイズの混入こそが、私にとっては音楽を聴く体験そのものなのだと思う。
最近の仕事でも同じことを感じる。すべてを効率化し、AIで最適化されたコードを書くのは確かに気持ちいい。だが、ふとしたバグ調査の途中で脱線してオープンソースのソースコードを読みふけってしまう、あの寄り道にこそエンジニアとしての面白さが詰まっているのではないだろうか。`
  },
  ai_blog: {
    key: 'ai_blog',
    domain: 'blog',
    title: 'AI生成ブログ',
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
    key: 'spec',
    domain: 'technical_doc',
    title: '技術論文',
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
  sns: {
    key: 'sns',
    domain: 'blog',
    title: 'SNS投稿',
    text: `最近のAI凄すぎん？w 誰でもプロ級の絵が描ける時代きたな...これからのクリエイターはどう生き残るべきなんだろう🤔`
  },
  short: {
    key: 'short',
    domain: 'blog',
    title: '短文テスト',
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
      <section class="glass-panel rounded-xl p-5 flex flex-col gap-4">
        <!-- Header -->
        <div class="flex items-center justify-between px-1">
          <h3 class="text-on-surface text-sm font-bold flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-sm">edit_note</span>
            解析テキスト入力
          </h3>
          <button class="text-primary text-xs font-medium flex items-center gap-1 hover:underline cursor-pointer" id="clearBtn">
            <span class="material-symbols-outlined text-xs">delete</span>
            クリア
          </button>
        </div>

        <!-- Presets / Chips -->
        <div class="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button class="preset-btn shrink-0 px-4 py-1.5 rounded-full bg-surface-container-high border border-outline-variant text-xs text-on-surface-variant hover:bg-primary-container hover:text-on-primary-container transition-all cursor-pointer" data-preset="essay">
            人間エッセイ
          </button>
          <button class="preset-btn shrink-0 px-4 py-1.5 rounded-full bg-surface-container-high border border-outline-variant text-xs text-on-surface-variant hover:bg-primary-container hover:text-on-primary-container transition-all cursor-pointer" data-preset="ai_blog">
            AI生成ブログ
          </button>
          <button class="preset-btn shrink-0 px-4 py-1.5 rounded-full bg-surface-container-high border border-outline-variant text-xs text-on-surface-variant hover:bg-primary-container hover:text-on-primary-container transition-all cursor-pointer" data-preset="spec">
            技術論文
          </button>
          <button class="preset-btn shrink-0 px-4 py-1.5 rounded-full bg-surface-container-high border border-outline-variant text-xs text-on-surface-variant hover:bg-primary-container hover:text-on-primary-container transition-all cursor-pointer" data-preset="sns">
            SNS投稿
          </button>
        </div>

        <!-- Text Area with Counter -->
        <div class="relative group">
          <textarea
            id="analysisTextarea"
            class="w-full h-48 bg-surface-container-low border border-outline-variant rounded-xl p-4 text-on-surface text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none resize-none"
            placeholder="解析したい日本語の文章を入力してください..."
          ></textarea>
          <div class="absolute bottom-3 right-3 text-outline text-[10px] font-label" id="charCounter">
            0 / 2000 文字
          </div>
        </div>

        <!-- Submit Button -->
        <button
          id="analyzeBtn"
          class="w-full bg-primary text-on-primary py-4 rounded-xl font-bold text-base shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer hover:opacity-95"
        >
          <span class="material-symbols-outlined">analytics</span>
          解析を実行する
        </button>
      </section>
    `;

    this.textarea = this.container.querySelector('#analysisTextarea');
    this.charCounter = this.container.querySelector('#charCounter');
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

    const presetBtns = this.container.querySelectorAll('.preset-btn');
    presetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const presetKey = btn.getAttribute('data-preset');
        const sampleData = SAMPLE_TEXTS[presetKey];
        if (sampleData) {
          this.textarea.value = sampleData.text;
          this.updateCharCounter();
          if (typeof this.onSelectSample === 'function') {
            this.onSelectSample(sampleData);
          } else if (typeof this.onInputText === 'function') {
            this.onInputText(sampleData.text);
          }
        }
      });
    });
  }

  updateCharCounter() {
    const len = this.textarea.value.length;
    this.charCounter.textContent = `${len} / 2000 文字`;
    
    if (len > 1800) {
      this.charCounter.classList.add('text-error');
      this.charCounter.classList.remove('text-outline');
    } else {
      this.charCounter.classList.remove('text-error');
      this.charCounter.classList.add('text-outline');
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
