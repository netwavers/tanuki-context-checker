import { TanukiContextChecker } from './pipeline.js';

const checker = new TanukiContextChecker();

if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
  self.onmessage = function (e) {
    const { text, domain, docId, requestId } = e.data || {};
    try {
      const report = checker.analyzeText(text, domain, docId);
      const proofreadPayload = checker.generateProofreadPayload(text, domain, docId);
      self.postMessage({ status: 'success', requestId, report, proofreadPayload });
    } catch (err) {
      self.postMessage({ status: 'error', requestId, error: err.message || String(err) });
    }
  };
}
