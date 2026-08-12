import test from 'node:test';
import assert from 'node:assert/strict';
import { TanukiContextChecker } from '../src/analyzer/pipeline.js';

test('TanukiContextChecker JS generateProofreadPayload Test', () => {
  const checker = new TanukiContextChecker();
  const sampleText = `
    AI技術の普及に伴い、様々な業務が効率化されています。
    結論として、AIの活用は非常に効果的であると言えるでしょう。
    第一にコスト削減が挙げられます。第二にスピード向上が挙げられます。
  `;

  const payload = checker.generateProofreadPayload(sampleText, 'general');

  assert.ok(payload);
  assert.equal(payload.domain_applied, 'general');
  assert.ok(payload.diagnostics.surface);
  assert.ok(payload.diagnostics.lexical);
  assert.ok(payload.diagnostics.structural);
  assert.ok(payload.diagnostics.flow);

  assert.ok(Array.isArray(payload.proofreading_directives));
  assert.ok(payload.proofreading_directives.length > 0);

  assert.ok(payload.llm_prompt_template.system_prompt.includes('AI臭さ'));
  assert.ok(payload.llm_prompt_template.user_prompt.includes('AI校正指示'));
});
