export class HeaderComponent {
  constructor(container, onDomainChange) {
    this.container = container;
    this.onDomainChange = onDomainChange;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <header class="sticky top-0 z-50 flex items-center bg-background/80 backdrop-blur-md p-4 justify-between border-b border-surface-variant">
        <div class="flex items-center gap-3">
          <div class="text-primary flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-high border border-outline-variant/40 shadow-sm" data-icon="PawPrint">
            <span class="material-symbols-outlined text-3xl">pets</span>
          </div>
          <h1 class="text-on-surface text-lg font-bold leading-tight tracking-tight">Tanuki Context Checker</h1>
        </div>

        <div class="flex items-center gap-3">
          <div class="domain-selector-wrapper flex items-center gap-2 bg-surface-container-low border border-outline-variant px-3 py-1.5 rounded-lg">
            <label for="domainSelect" class="text-xs text-tertiary font-medium flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">language</span>
              ドメイン:
            </label>
            <select id="domainSelect" class="domain-select bg-transparent text-on-surface text-xs font-bold outline-none cursor-pointer">
              <option value="general">一般散文 (general)</option>
              <option value="technical_doc">仕様書・技術設計書 (technical_doc)</option>
              <option value="blog">技術・個人ブログ (blog)</option>
              <option value="essay">散文・雑記・エッセイ (essay)</option>
              <option value="report">業務・調査レポート (report)</option>
              <option value="academic_paper">学術論文 (academic_paper)</option>
            </select>
          </div>
          <button class="text-on-surface hover:bg-surface-variant p-2 rounded-full transition-colors cursor-pointer" id="settingsBtn" title="設定">
            <span class="material-symbols-outlined">settings</span>
          </button>
        </div>
      </header>
    `;

    const selectEl = this.container.querySelector('#domainSelect');
    if (selectEl) {
      selectEl.addEventListener('change', (e) => {
        if (typeof this.onDomainChange === 'function') {
          this.onDomainChange(e.target.value);
        }
      });
    }

    const settingsBtn = this.container.querySelector('#settingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        alert('Tanuki Context Checker - SeaCafe Edition v1.0.0\nすべての解析はブラウザ内で完結し、データは送信されません。');
      });
    }
  }

  setDomain(domain) {
    const selectEl = this.container.querySelector('#domainSelect');
    if (selectEl) {
      selectEl.value = domain;
    }
  }
}
