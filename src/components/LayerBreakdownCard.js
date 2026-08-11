export class LayerBreakdownCardComponent {
  constructor(container) {
    this.container = container;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="glass-panel layer-breakdown-card">
        <h3>
          <span>📊 4層別スコアブレイクダウン</span>
          <span style="font-size:0.75rem; font-weight:normal; color:var(--seacafe-white-dim);">100点満点（高いほどAI均質化傾向）</span>
        </h3>
        <div class="layer-list">
          <!-- Surface Layer -->
          <div class="layer-item">
            <div class="layer-header">
              <span class="layer-name">✨ 表層記号 (Surface)</span>
              <span class="layer-score-val" id="scoreSurface">0.0</span>
            </div>
            <div class="progress-track">
              <div class="progress-bar bar-surface" id="barSurface" style="width: 0%;"></div>
            </div>
          </div>

          <!-- Lexical Layer -->
          <div class="layer-item">
            <div class="layer-header">
              <span class="layer-name">📚 語彙・表現密度 (Lexical)</span>
              <span class="layer-score-val" id="scoreLexical">0.0</span>
            </div>
            <div class="progress-track">
              <div class="progress-bar bar-lexical" id="barLexical" style="width: 0%;"></div>
            </div>
          </div>

          <!-- Structural Layer -->
          <div class="layer-item">
            <div class="layer-header">
              <span class="layer-name">🏛 構造統計・均一性 (Structural)</span>
              <span class="layer-score-val" id="scoreStructural">0.0</span>
            </div>
            <div class="progress-track">
              <div class="progress-bar bar-structural" id="barStructural" style="width: 0%;"></div>
            </div>
          </div>

          <!-- Flow Layer -->
          <div class="layer-item">
            <div class="layer-header">
              <span class="layer-name">🌊 ゆらぎフロー・思考痕跡 (Flow)</span>
              <span class="layer-score-val" id="scoreFlow">0.0</span>
            </div>
            <div class="progress-track">
              <div class="progress-bar bar-flow" id="barFlow" style="width: 0%;"></div>
            </div>
          </div>
        </div>
      </div>
    `;

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
      this.setLayer('Surface', 0);
      this.setLayer('Lexical', 0);
      this.setLayer('Structural', 0);
      this.setLayer('Flow', 0);
      return;
    }

    const layers = report.layer_scores;
    this.setLayer('Surface', layers.surface || 0);
    this.setLayer('Lexical', layers.lexical || 0);
    this.setLayer('Structural', layers.structural || 0);
    this.setLayer('Flow', layers.flow || 0);
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
