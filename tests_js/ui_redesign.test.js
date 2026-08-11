import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_TEXTS } from '../src/components/TextInputPanel.js';

test('UI Component Redesign Specifications & Preset Interactivity Test', () => {
  // Test 1: Sample texts exist for required preset keys
  assert.ok(SAMPLE_TEXTS.essay, 'Preset "essay" must exist');
  assert.ok(SAMPLE_TEXTS.ai_blog, 'Preset "ai_blog" must exist');
  assert.ok(SAMPLE_TEXTS.spec, 'Preset "spec" must exist');
  assert.ok(SAMPLE_TEXTS.sns, 'Preset "sns" must exist');

  assert.equal(SAMPLE_TEXTS.essay.title, '人間エッセイ');
  assert.equal(SAMPLE_TEXTS.ai_blog.title, 'AI生成ブログ');
  assert.equal(SAMPLE_TEXTS.spec.title, '技術論文');
  assert.equal(SAMPLE_TEXTS.sns.title, 'SNS投稿');

  // Test 2: Sample text content length sanity check
  assert.ok(SAMPLE_TEXTS.essay.text.length > 100);
  assert.ok(SAMPLE_TEXTS.ai_blog.text.length > 100);
  assert.ok(SAMPLE_TEXTS.spec.text.length > 100);
  assert.ok(SAMPLE_TEXTS.sns.text.length > 20);

  console.log('✅ UI Redesign Presets Test Passed!');
});
