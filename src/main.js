import { TanukiContextChecker } from './analyzer/pipeline.js';
import { HeaderComponent } from './components/Header.js';
import { TextInputPanelComponent } from './components/TextInputPanel.js';
import { ScoreGaugeDialComponent } from './components/ScoreGaugeDial.js';
import { LayerBreakdownCardComponent } from './components/LayerBreakdownCard.js';
import { EvidenceListCardComponent } from './components/EvidenceListCard.js';
import { BottomNavComponent } from './components/BottomNav.js';

class App {
  constructor() {
    this.domain = 'general';
    this.text = '';
    this.report = null;

    this.checker = new TanukiContextChecker();
    this.worker = null;
    this.initWorker();
    this.initUI();
  }

  initWorker() {
    try {
      this.worker = new Worker(new URL('./analyzer/worker.js', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e) => {
        const { status, report, error } = e.data || {};
        if (status === 'success' && report) {
          this.report = report;
          this.updateDashboard();
        } else if (error) {
          console.error('Worker Analysis Error:', error);
          this.runDirectAnalysis();
        }
      };
    } catch (e) {
      console.warn('Web Worker not supported or failed to initialize. Falling back to direct thread execution.', e);
      this.worker = null;
    }
  }

  initUI() {
    // 1. Header
    const headerContainer = document.getElementById('headerContainer');
    this.header = new HeaderComponent(headerContainer, (newDomain) => {
      this.domain = newDomain;
      this.runAnalysis();
    });

    // 2. Input Panel
    const inputPanelContainer = document.getElementById('inputPanelContainer');
    this.inputPanel = new TextInputPanelComponent(inputPanelContainer, {
      onInputText: (text) => {
        this.text = text;
        this.runAnalysis();
      },
      onSelectSample: (sampleData) => {
        this.text = sampleData.text;
        if (sampleData.domain) {
          this.domain = sampleData.domain;
          this.header.setDomain(this.domain);
        }
        this.runAnalysis();
      }
    });

    // 3. Dashboard components
    const scoreGaugeContainer = document.getElementById('scoreGaugeContainer');
    this.scoreGauge = new ScoreGaugeDialComponent(scoreGaugeContainer);

    const layerBreakdownContainer = document.getElementById('layerBreakdownContainer');
    this.layerBreakdown = new LayerBreakdownCardComponent(layerBreakdownContainer);

    const evidenceListContainer = document.getElementById('evidenceListContainer');
    this.evidenceList = new EvidenceListCardComponent(evidenceListContainer);

    // 4. Fixed Bottom Navigation Component
    const bottomNavContainer = document.getElementById('bottomNavContainer');
    if (bottomNavContainer) {
      this.bottomNav = new BottomNavComponent(bottomNavContainer, (tab) => {
        if (tab === 'settings') {
          alert('設定画面: SeaCafe Edition v1.0.0 (Pure Client-Side Engine)');
        } else if (tab === 'history') {
          alert('履歴機能: 直近の解析履歴はローカルストレージに保存されます。');
        }
      });
    }

    // Initial Dashboard reset
    this.updateDashboard();
  }

  runAnalysis() {
    if (!this.text || this.text.trim().length === 0) {
      this.report = null;
      this.updateDashboard();
      return;
    }

    if (this.worker) {
      this.worker.postMessage({
        text: this.text,
        domain: this.domain,
        docId: `doc_${Date.now()}`
      });
    } else {
      this.runDirectAnalysis();
    }
  }

  runDirectAnalysis() {
    try {
      this.report = this.checker.analyzeText(this.text, this.domain, `doc_${Date.now()}`);
    } catch (e) {
      console.error('Direct Analysis Error:', e);
      this.report = null;
    }
    this.updateDashboard();
  }

  updateDashboard() {
    this.scoreGauge.update(this.report);
    this.layerBreakdown.update(this.report);
    this.evidenceList.update(this.report);
  }
}

// Bootstrap App
document.addEventListener('DOMContentLoaded', () => {
  window.tanukiApp = new App();
});
