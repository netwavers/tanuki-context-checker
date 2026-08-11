export class LayerBreakdownCardComponent {
  constructor(container) {
    this.container = container;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <section class="glass-panel rounded-xl p-5 flex flex-col gap-4">
        <h3 class="text-on-surface text-sm font-bold flex items-center justify-between">
          <span class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-base">bar_chart</span>
            詳細分析メトリクス
          </span>
          <span class="text-[11px] font-normal text-outline font-label">100点満点 (高いほどAI均質化)</span>
        </h3>

        <!-- Perplexity & Burstiness Grid -->
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-surface-container rounded-xl p-4 border border-outline-variant/30">
            <p class="text-outline text-[10px] uppercase font-bold tracking-wider font-label">Perplexity</p>
            <p class="text-on-surface text-xl font-bold mt-1" id="pplVal">--</p>
            <div class="w-full h-1 bg-surface-container-highest rounded-full mt-2 overflow-hidden">
              <div class="h-full bg-error rounded-full transition-all duration-500" id="pplBar" style="width: 0%;"></div>
            </div>
          </div>

          <div class="bg-surface-container rounded-xl p-4 border border-outline-variant/30">
            <p class="text-outline text-[10px] uppercase font-bold tracking-wider font-label">Burstiness</p>
            <p class="text-on-surface text-xl font-bold mt-1" id="burstVal">--</p>
            <div class="w-full h-1 bg-surface-container-highest rounded-full mt-2 overflow-hidden">
              <div class="h-full bg-tertiary rounded-full transition-all duration-500" id="burstBar" style="width: 0%;"></div>
            </div>
          </div>
        </div>

        <!-- 4-Layer Progress Bars -->
        <div class="flex flex-col gap-3 mt-1">
          <!-- Surface -->
          <div class="layer-item">
            <div class="flex justify-between text-xs mb-1">
              <span class="text-on-surface font-medium flex items-center gap-1">✨ 表層記号 (Surface)</span>
              <span class="font-label font-bold text-primary" id="scoreSurface">0.0</span>
            </div>
            <div class="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
              <div class="h-full bar-surface rounded-full transition-all duration-500" id="barSurface" style="width: 0%;"></div>
            </div>
          </div>

          <!-- Lexical -->
          <div class="layer-item">
            <div class="flex justify-between text-xs mb-1">
              <span class="text-on-surface font-medium flex items-center gap-1">📚 語彙・表現密度 (Lexical)</span>
              <span class="font-label font-bold text-primary" id="scoreLexical">0.0</span>
            </div>
            <div class="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
              <div class="h-full bar-lexical rounded-full transition-all duration-500" id="barLexical" style="width: 0%;"></div>
            </div>
          </div>

          <!-- Structural -->
          <div class="layer-item">
            <div class="flex justify-between text-xs mb-1">
              <span class="text-on-surface font-medium flex items-center gap-1">🏛 構造統計・均一性 (Structural)</span>
              <span class="font-label font-bold text-primary" id="scoreStructural">0.0</span>
            </div>
            <div class="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
              <div class="h-full bar-structural rounded-full transition-all duration-500" id="barStructural" style="width: 0%;"></div>
            </div>
          </div>

          <!-- Flow -->
          <div class="layer-item">
            <div class="flex justify-between text-xs mb-1">
              <span class="text-on-surface font-medium flex items-center gap-1">🌊 ゆらぎフロー・思考痕跡 (Flow)</span>
              <span class="font-label font-bold text-primary" id="scoreFlow">0.0</span>
            </div>
            <div class="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
              <div class="h-full bar-flow rounded-full transition-all duration-500" id="barFlow" style="width: 0%;"></div>
            </div>
          </div>
        </div>
      </section>
    `;

    this.pplVal = this.container.querySelector('#pplVal');
    this.pplBar = this.container.querySelector('#pplBar');
    this.burstVal = this.container.querySelector('#burstVal');
    this.burstBar = this.container.querySelector('#burstBar');

    this.scoreSurface = this.container.querySelector('#scoreSurface');
    this.barSurface = this.container.querySelector('#barSurface');

    this.scoreLexical = this.container.querySelector('#scoreLexical');
    this.barLexical = this.container.querySelector('#barLexical');

    this.scoreStructural = this.container.querySelector('#scoreStructural');
    this.barStructural = this.container.querySelector('#barStructural');

    this.scoreFlow = this.container.querySelector('#scoreFlow');
    this.barFlow = this.container.querySelector('#barFlow');
  }

  update(report) {
    if (!report || !report.layer_scores) {
      this.pplVal.textContent = '--';
      this.pplBar.style.width = '0%';
      this.burstVal.textContent = '--';
      this.burstBar.style.width = '0%';

      this.setLayer('Surface', 0);
      this.setLayer('Lexical', 0);
      this.setLayer('Structural', 0);
      this.setLayer('Flow', 0);
      return;
    }

    const layers = report.layer_scores;
    const surfScore = layers.surface || 0;
    const lexScore = layers.lexical || 0;
    const structScore = layers.structural || 0;
    const flowScore = layers.flow || 0;

    this.setLayer('Surface', surfScore);
    this.setLayer('Lexical', lexScore);
    this.setLayer('Structural', structScore);
    this.setLayer('Flow', flowScore);

    // Compute or render Perplexity and Burstiness metrics
    const pplEstimate = (structScore * 0.35 + lexScore * 0.25 + 8.0).toFixed(1);
    this.pplVal.textContent = pplEstimate;
    this.pplBar.style.width = `${Math.min(100, Math.max(10, structScore * 1.1))}%`;

    let burstText = 'Low';
    let burstPercent = 30;
    if (flowScore > 65) {
      burstText = 'High';
      burstPercent = 85;
    } else if (flowScore > 35) {
      burstText = 'Medium';
      burstPercent = 55;
    }
    this.burstVal.textContent = burstText;
    this.burstBar.style.width = `${burstPercent}%`;
  }

  setLayer(layerKey, val) {
    const valFixed = val.toFixed(1);
    const clampedVal = Math.max(0, Math.min(100, val));
    if (this[`score${layerKey}`]) {
      this[`score${layerKey}`].textContent = valFixed;
    }
    if (this[`bar${layerKey}`]) {
      this[`bar${layerKey}`].style.width = `${clampedVal}%`;
    }
  }
}
