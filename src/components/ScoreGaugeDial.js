export class ScoreGaugeDialComponent {
  constructor(container) {
    this.container = container;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <section class="glass-panel rounded-xl p-6 flex flex-col items-center gap-4 shadow-xl">
        <h2 class="text-primary-fixed-dim text-sm font-medium tracking-widest uppercase">AI均質化スコア</h2>
        
        <div class="relative flex items-center justify-center size-40 my-2">
          <svg class="size-full transform -rotate-90" viewBox="0 0 160 160">
            <circle
              class="text-surface-container-highest"
              cx="80"
              cy="80"
              r="70"
              fill="transparent"
              stroke="currentColor"
              stroke-width="8"
            ></circle>
            <circle
              id="gaugeArc"
              class="text-error"
              cx="80"
              cy="80"
              r="70"
              fill="transparent"
              stroke="currentColor"
              stroke-width="8"
              stroke-dasharray="440"
              stroke-dashoffset="440"
              stroke-linecap="round"
              style="transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease;"
            ></circle>
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-5xl font-bold text-on-surface" id="scoreVal">0</span>
            <span class="text-xs text-outline">/ 100</span>
          </div>
        </div>

        <div class="text-center">
          <p class="text-lg font-bold transition-colors" id="classificationText">未解析</p>
          <p class="text-on-surface-variant text-xs mt-1" id="classificationSubtext">文章を入力して解析を開始してください</p>
        </div>

        <div id="confidenceIndicator" class="text-xs text-outline font-label mt-1">信頼度: --</div>

        <div class="w-full h-1.5 score-gradient rounded-full opacity-30 mt-2"></div>
      </section>
    `;

    this.gaugeArc = this.container.querySelector('#gaugeArc');
    this.scoreVal = this.container.querySelector('#scoreVal');
    this.classificationText = this.container.querySelector('#classificationText');
    this.classificationSubtext = this.container.querySelector('#classificationSubtext');
    this.confidenceIndicator = this.container.querySelector('#confidenceIndicator');
  }

  update(report) {
    if (!report) {
      this.scoreVal.textContent = '0';
      this.classificationText.textContent = '未解析';
      this.classificationText.className = 'text-lg font-bold text-outline';
      this.classificationSubtext.textContent = '文章を入力して解析を開始してください';
      this.confidenceIndicator.textContent = '信頼度: --';
      this.setGaugeOffset(440, '#9a8e8e');
      return;
    }

    const score = report.overall_score || 0;
    this.scoreVal.textContent = Math.round(score);

    // Circumference of r=70 circle is 2 * PI * 70 ≈ 440
    const maxLen = 440;
    const clampedScore = Math.max(0, Math.min(100, score));
    const offset = maxLen - (maxLen * clampedScore / 100);

    let titleText = '人間執筆の可能性が高い';
    let subText = '文章に十分な思考のゆらぎが確認されました';
    let titleClass = 'text-lg font-bold text-emerald-400';
    let strokeColor = '#4ade80';

    if (report.confidence === 'INSUFFICIENT_LENGTH') {
      titleText = '100文字未満 (判定不可)';
      subText = '判定に必要な文字数が不足しています';
      titleClass = 'text-lg font-bold text-outline';
      strokeColor = '#9a8e8e';
    } else if (report.classification === 'AI_HOMOGENEOUS_HIGH') {
      titleText = 'AI生成の可能性が高い';
      subText = '文章に高度な均質性が確認されました';
      titleClass = 'text-lg font-bold text-error';
      strokeColor = '#ffb4ab';
    } else if (report.classification === 'MIXED_NEEDS_REVIEW') {
      titleText = '混在・要確認';
      subText = 'AI生成と人間のゆらぎが混在しています';
      titleClass = 'text-lg font-bold text-yellow-400';
      strokeColor = '#facc15';
    }

    this.classificationText.textContent = titleText;
    this.classificationText.className = titleClass;
    this.classificationSubtext.textContent = subText;

    const confMap = {
      HIGH: 'HIGH (高信頼度)',
      MEDIUM: 'MEDIUM (中信頼度)',
      LOW: 'LOW (低信頼度)',
      INSUFFICIENT_LENGTH: 'INSUFFICIENT_LENGTH (100文字未満)'
    };
    this.confidenceIndicator.textContent = `判定信頼度: ${confMap[report.confidence] || report.confidence}`;

    this.setGaugeOffset(offset, strokeColor);
  }

  setGaugeOffset(offset, strokeColor) {
    if (this.gaugeArc) {
      this.gaugeArc.style.strokeDashoffset = offset;
      if (strokeColor) {
        this.gaugeArc.style.stroke = strokeColor;
      }
    }
  }
}
