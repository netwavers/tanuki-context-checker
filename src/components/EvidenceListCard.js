export class EvidenceListCardComponent {
  constructor(container) {
    this.container = container;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="glass-panel evidence-card">
        <h3>🔍 主要な検出根拠・説明 (Explainability)</h3>
        <ul class="evidence-list" id="evidenceList">
          <li class="evidence-item">解析結果がここに表示されます...</li>
        </ul>
      </div>
    `;

    this.evidenceList = this.container.querySelector('#evidenceList');
  }

  update(report) {
    if (!report || !report.evidence_explanations || report.evidence_explanations.length === 0) {
      this.evidenceList.innerHTML = `
        <li class="evidence-item">（解析対象のテキストを入力してください）</li>
      `;
      return;
    }

    const items = report.evidence_explanations.map(exp => {
      let icon = '📌';
      let itemClass = 'evidence-item';

      if (exp.includes('ドメイン補正')) {
        icon = '⚖️';
        itemClass += ' domain-note';
      } else if (exp.includes('検出') || exp.includes('消し忘れ') || exp.includes('高頻度') || exp.includes('均一') || exp.includes('欠如')) {
        icon = '🚨';
        itemClass += ' ai-signal';
      } else if (exp.includes('思考の自己訂正') || exp.includes('一人称') || exp.includes('脱線') || exp.includes('暗黙')) {
        icon = '🌱';
        itemClass += ' human-signal';
      }

      return `<li class="${itemClass}"><span>${icon} ${this.escapeHtml(exp)}</span></li>`;
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
