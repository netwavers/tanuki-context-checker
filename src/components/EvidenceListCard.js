export class EvidenceListCardComponent {
  constructor(container) {
    this.container = container;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <section class="glass-panel rounded-xl p-5 flex flex-col gap-4">
        <!-- Explanation Rationale Card (info icon) -->
        <div class="bg-surface-container-low rounded-xl p-4 border-l-4 border-primary">
          <div class="flex items-start gap-3">
            <span class="material-symbols-outlined text-primary mt-0.5 text-lg">info</span>
            <div>
              <p class="text-on-surface text-xs font-bold">判定の解説</p>
              <p class="text-on-surface-variant text-[11px] leading-relaxed mt-1" id="rationaleSummary">
                解析対象のテキストを入力してください。
              </p>
            </div>
          </div>
        </div>

        <!-- Detailed Evidence Items -->
        <div>
          <h3 class="text-on-surface text-xs font-bold uppercase tracking-wider text-outline mb-2 flex items-center gap-1 font-label">
            <span class="material-symbols-outlined text-sm">find_in_page</span>
            主要な検出根拠 (Evidence Items)
          </h3>
          <ul class="flex flex-col gap-2" id="evidenceList">
            <li class="text-xs text-outline italic">解析結果がここに表示されます...</li>
          </ul>
        </div>

        <!-- AI Proofreading Prompt Card -->
        <div class="border-t border-outline-variant/30 pt-4 flex flex-col gap-2" id="proofreadPanel">
          <div class="flex items-center justify-between">
            <h3 class="text-on-surface text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1 font-label">
              <span class="material-symbols-outlined text-sm">auto_fix_high</span>
              AI校正プロンプト (AI Proofreading Context)
            </h3>
            <button id="copyPromptBtn" class="px-2.5 py-1 text-[11px] font-medium bg-primary-container hover:bg-primary/20 text-on-primary-container rounded-lg flex items-center gap-1 transition-colors">
              <span class="material-symbols-outlined text-xs">content_copy</span>
              <span id="copyBtnText">プロンプトをコピー</span>
            </button>
          </div>
          <div class="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/30 text-[11px] font-mono text-on-surface-variant overflow-x-auto max-h-40 whitespace-pre-wrap leading-relaxed select-text" id="proofreadPromptPreview">
            （解析結果からAI校正指示プロンプトが自動生成されます）
          </div>
        </div>
      </section>
    `;

    this.rationaleSummary = this.container.querySelector('#rationaleSummary');
    this.evidenceList = this.container.querySelector('#evidenceList');
    this.proofreadPromptPreview = this.container.querySelector('#proofreadPromptPreview');
    this.copyPromptBtn = this.container.querySelector('#copyPromptBtn');
    this.copyBtnText = this.container.querySelector('#copyBtnText');

    this.currentPrompt = '';

    this.copyPromptBtn?.addEventListener('click', () => {
      if (!this.currentPrompt) {
        if (this.copyBtnText) {
          this.copyBtnText.textContent = 'コピー対象がありません';
          setTimeout(() => {
            if (this.copyBtnText) this.copyBtnText.textContent = 'プロンプトをコピー';
          }, 2000);
        }
        return;
      }
      this.copyToClipboard(this.currentPrompt)
        .then(() => {
          if (this.copyBtnText) {
            this.copyBtnText.textContent = 'コピーしました！';
            setTimeout(() => {
              if (this.copyBtnText) this.copyBtnText.textContent = 'プロンプトをコピー';
            }, 2000);
          }
        })
        .catch((err) => {
          console.error('Failed to copy prompt:', err);
          if (this.copyBtnText) {
            this.copyBtnText.textContent = 'コピー失敗';
            setTimeout(() => {
              if (this.copyBtnText) this.copyBtnText.textContent = 'プロンプトをコピー';
            }, 2000);
          }
        });
    });
  }

  copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (successful) {
          resolve();
        } else {
          reject(new Error('execCommand copy failed'));
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  update(report, payload) {
    // 1. Update Prompt Panel
    if (payload && payload.llm_prompt_template) {
      this.currentPrompt = `=== SYSTEM PROMPT ===\n${payload.llm_prompt_template.system_prompt}\n\n=== USER PROMPT ===\n${payload.llm_prompt_template.user_prompt}`;
      if (this.proofreadPromptPreview) {
        this.proofreadPromptPreview.textContent = this.currentPrompt;
      }
    } else if (report && report.llm_prompt_template) {
      this.currentPrompt = `=== SYSTEM PROMPT ===\n${report.llm_prompt_template.system_prompt}\n\n=== USER PROMPT ===\n${report.llm_prompt_template.user_prompt}`;
      if (this.proofreadPromptPreview) {
        this.proofreadPromptPreview.textContent = this.currentPrompt;
      }
    } else {
      this.currentPrompt = '';
      if (this.proofreadPromptPreview) {
        this.proofreadPromptPreview.textContent = '（解析対象テキスト入力時にAI校正プロンプトが自動生成されます）';
      }
    }

    // 2. Update Evidence List & Rationale Summary
    if (!report || !report.evidence_explanations || report.evidence_explanations.length === 0) {
      this.rationaleSummary.textContent = '解析対象のテキストを入力してください。';
      this.evidenceList.innerHTML = `
        <li class="text-xs text-outline italic p-2 bg-surface-container-low rounded-lg">（解析対象のテキストを入力してください）</li>
      `;
      return;
    }

    // Set summary explanation text based on classification
    if (report.classification === 'AI_HOMOGENEOUS_HIGH') {
      this.rationaleSummary.textContent =
        '文章構造が非常に一定であり、語彙の選択が予測可能な範囲に留まっています。これは典型的な大規模言語モデルによる生成パターンの特徴です。';
    } else if (report.classification === 'MIXED_NEEDS_REVIEW') {
      this.rationaleSummary.textContent =
        '定型的なAI文章構造と人間特有の表現が混在しています。AIで生成されたドラフトに加筆編集された可能性があります。';
    } else if (report.classification === 'HUMAN_FLUCTUATION_STRONG') {
      this.rationaleSummary.textContent =
        '文長の多様性や感情・思考の試行錯誤が明確にみられ、人間執筆特有の豊かな思考フローマップが検出されました。';
    } else if (report.confidence === 'INSUFFICIENT_LENGTH') {
      this.rationaleSummary.textContent =
        '100文字未満の短文のため、統計的判定の精度が制限されています。100文字以上の文章の入力をおすすめします。';
    } else {
      this.rationaleSummary.textContent = '文章の均質性および表現パターンの総合解析結果です。';
    }

    // Map evidence items
    const items = report.evidence_explanations.map((exp) => {
      let icon = 'info';
      let iconColor = 'text-primary';
      let itemBg = 'bg-surface-container-low border-outline-variant/30';

      if (exp.includes('ドメイン補正')) {
        icon = 'balance';
        iconColor = 'text-tertiary';
        itemBg = 'bg-tertiary-container/20 border-tertiary/30';
      } else if (
        exp.includes('検出') ||
        exp.includes('消し忘れ') ||
        exp.includes('高頻度') ||
        exp.includes('均一') ||
        exp.includes('欠如')
      ) {
        icon = 'warning';
        iconColor = 'text-error';
        itemBg = 'bg-error-container/20 border-error/30';
      } else if (
        exp.includes('思考の自己訂正') ||
        exp.includes('一人称') ||
        exp.includes('脱線') ||
        exp.includes('暗黙')
      ) {
        icon = 'eco';
        iconColor = 'text-emerald-400';
        itemBg = 'bg-emerald-950/20 border-emerald-500/30';
      }

      return `
        <li class="flex items-start gap-2 p-2.5 rounded-lg border text-xs text-on-surface leading-relaxed ${itemBg}">
          <span class="material-symbols-outlined text-sm mt-0.5 shrink-0 ${iconColor}">${icon}</span>
          <span>${this.escapeHtml(exp)}</span>
        </li>
      `;
    });

    this.evidenceList.innerHTML = items.join('');
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
