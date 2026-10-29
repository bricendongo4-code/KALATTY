import test from 'node:test';
import assert from 'node:assert/strict';
import { clean, severity, collectFindings } from './qa-utils.mjs';

test('sanitizes untrusted GitHub metadata for markdown tables', () => {
  assert.equal(clean('foo|bar\n<script>'), 'foo bar &lt;script>');
  assert.equal(clean(null), '');
});
test('classifies sensitive test failures as high priority', () => {
  assert.equal(severity('auth permission check'), 'high');
  assert.equal(severity('frontend build'), 'medium');
  assert.equal(severity('documentation'), 'low');
});
test('collects failed steps and ignores successful ones', () => {
  const findings = collectFindings([
    { name: 'Backend', html_url: 'https://example.test', conclusion: 'failure', steps: [
      { name: 'Build', conclusion: 'success' },
      { name: 'Auth tests', conclusion: 'failure' },
    ] },
    { name: 'Frontend', conclusion: 'success', steps: [{ name: 'Lint', conclusion: 'success' }] },
  ]);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].priority, 'high');
  assert.equal(findings[0].step, 'Auth tests');
});
test('reports failed job when step detail is missing', () => {
  const findings = collectFindings([{ name: 'Backend', conclusion: 'timed_out' }]);
  assert.equal(findings.length, 1);
  assert.match(findings[0].step, /no step detail/);
});
test('no false positive for completed successful jobs', () => {
  assert.deepEqual(collectFindings([{ name: 'Backend', conclusion: 'success', steps: [] }]), []);
});
