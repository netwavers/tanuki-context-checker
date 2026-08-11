export class HeaderComponent {
  constructor(container, onDomainChange) {
    this.container = container;
    this.onDomainChange = onDomainChange;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <header class="app-header">
        <div class="header-content">
          <div class="brand-section">
            <div class="brand-logo">🐾</div>
            <div class="brand-text">
              <h1>
                Tanuki Context Checker
                <span class="badge-edition">SeaCafe Edition</span>
              </h1>
              <p>生成AI文章チェッカー — 思考のゆらぎ・均質化検出システム</p>
            </div>
          </div>
          <div class="domain-selector-wrapper">
            <label for="domainSelect">🌐 適用ドメイン:</label>
            <select id="domainSelect" class="domain-select">
              <option value="general">一般散文 (general)</option>
              <option value="technical_doc">仕様書・技術設計書 (technical_doc)</option>
              <option value="blog">技術・個人ブログ (blog)</option>
              <option value="essay">散文・雑記・エッセイ (essay)</option>
              <option value="report">業務・調査レポート (report)</option>
              <option value="academic_paper">学術論文 (academic_paper)</option>
            </select>
          </div>
        </div>
      </header>
    `;

    const selectEl = this.container.querySelector('#domainSelect');
    selectEl.addEventListener('change', (e) => {
      if (typeof this.onDomainChange === 'function') {
        this.onDomainChange(e.target.value);
      }
    });
  }

  setDomain(domain) {
    const selectEl = this.container.querySelector('#domainSelect');
    if (selectEl) {
      selectEl.value = domain;
    }
  }
}
