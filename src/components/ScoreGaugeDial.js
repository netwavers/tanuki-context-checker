export class ScoreGaugeDialComponent {
  constructor(container) {
    this.container = container;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="glass-panel score-gauge-panel">
        <div class="score-label">総合 AI 均質化判定スコア</div>
        <div class="gauge-svg-container">
          <svg class="gauge-svg" viewBox="0 0 200 120">
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#2a9d8f" />
                <stop offset="50%" stop-color="#e9c46a" />
                <stop offset="100%" stop-color="#e76f51" />
              </linearGradient>
            </defs>
            <!-- Background Arc Track -->
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              stroke-width="14"
              stroke-linecap="round"
            />
            <!-- Animated Value Arc -->
            <path
              id="gaugeArc"
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="url(#gaugeGradient)"
              stroke-width="14"
              stroke-linecap="round"
              stroke-dasharray="251.32"
              stroke-dashoffset="251.32"
              style="transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);"
            />
          </svg>
        </div>
        <div class="score-display-value" id="scoreVal">0.0</div>
        <div id="classificationBadge" class="classification-badge badge-human">
          <span>未解析</span>
        </div>
        <div id="confidenceIndicator" class="confidence-indicator">信頼度: HIGH</div>
      </div>
    `;

    this.gaugeArc = this.container.querySelector('#gaugeArc');
    this.scoreVal = this.container.querySelector('#scoreVal');
    this.classificationBadge = this.container.querySelector('#classificationBadge');
    this.confidenceIndicator = this.container.querySelector('#confidenceIndicator');
  }

  update(report) {
    if (!report) {
      this.scoreVal.textContent = '0.0';
      this.classificationBadge.className = 'classification-badge badge-human';
      this.classificationBadge.innerHTML = '<span>未解析</span>';
      this.confidenceIndicator.textContent = '信頼度: --';
      this.setGaugeOffset(0);
      return;
    }

    const score = report.overall_score || 0;
    this.scoreVal.textContent = score.toFixed(1);

    // Calculate stroke dashoffset for semi-circle arc (Total arc length ~ 251.32)
    // 0 score -> dashoffset = 251.32 (0% length)
    // 100 score -> dashoffset = 0 (100% length)
    const maxLen = 251.32;
    const clampedScore = Math.max(0, Math.min(100, score));
    const offset = maxLen - (maxLen * clampedScore / 100);
    this.setGaugeOffset(offset);

    // Classification Badge styling
    let badgeClass = 'badge-human';
    let badgeText = '🍃 人間らしいゆらぎ強 (人間執筆)';

    if (report.classification === 'AI_HOMOGENEOUS_HIGH') {
      badgeClass = 'badge-ai';
      badgeText = '🤖 AI生成の可能性高 (均質化・ゆらぎ欠如)';
    } else if (report.classification === 'MIXED_NEEDS_REVIEW') {
      badgeClass = 'badge-mixed';
      badgeText = '⚖️ 混在・要確認 (共同編集/要レビュー)';
    } else if (report.confidence === 'INSUFFICIENT_LENGTH') {
      badgeClass = 'badge-human';
      badgeText = '⚠️ 100文字未満 (判定不可)';
    }

    this.classificationBadge.className = `classification-badge ${badgeClass}`;
    this.classificationBadge.innerHTML = `<span>${badgeText}</span>`;

    // Confidence Flag text
    const confMap = {
      HIGH: 'HIGH (高信頼度)',
      MEDIUM: 'MEDIUM (中信頼度)',
      LOW: 'LOW (低信頼度)',
      INSUFFICIENT_LENGTH: 'INSUFFICIENT_LENGTH (100文字未満)'
    };
    this.confidenceIndicator.textContent = `判定信頼度: ${confMap[report.confidence] || report.confidence}`;
  }

  setGaugeOffset(offset) {
    if (this.gaugeArc) {
      this.gaugeArc.style.strokeDashoffset = offset;
    }
  }
}
