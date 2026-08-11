import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TanukiContextChecker } from '../src/analyzer/pipeline.js';

test('TanukiContextChecker JS Pipeline Evaluation Corpus Test', () => {
  const corpusData = JSON.parse(fs.readFileSync('tests/corpus/evaluation_corpus.json', 'utf-8'));
  const checker = new TanukiContextChecker();

  for (const sample of corpusData.samples) {
    const docId = sample.sample_id;
    const text = sample.text;
    const domain = sample.domain;

    const report = checker.analyzeText(text, domain, docId);

    assert.equal(report.doc_id, docId);
    assert.equal(report.domain_applied, domain);

    if (text.trim().length < 100) {
      assert.equal(report.confidence, 'INSUFFICIENT_LENGTH');
    } else {
      assert.ok(['HIGH', 'MEDIUM', 'LOW'].includes(report.confidence));
      assert.ok(['HUMAN_FLUCTUATION_STRONG', 'MIXED_NEEDS_REVIEW', 'AI_HOMOGENEOUS_HIGH'].includes(report.classification));
      assert.ok('surface' in report.layer_scores);
      assert.ok('lexical' in report.layer_scores);
      assert.ok('structural' in report.layer_scores);
      assert.ok('flow' in report.layer_scores);
    }

    console.log(`[PASS] Sample ${docId} | Score: ${report.overall_score} | Class: ${report.classification}`);
  }
});
