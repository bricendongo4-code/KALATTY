import test from 'node:test';
import assert from 'node:assert/strict';
import { redact, diagnoseLog } from './qa-log-analysis.mjs';

test('redacts common token and credential patterns', () => {
  const s = redact('Bearer abc123 password=secret123 ghp_abcdefghijklmnopqrstuvwxyz sk-abcdefghijklmnopqrstuvwxyz');
  assert.doesNotMatch(s, /abc123|secret123|ghp_abc|sk-abc/);
});
test('extracts conservative diagnostics without claiming root cause', () => {
  const f = diagnoseLog('error TS2345: wrong type\nFAIL auth.spec.ts\nECONNREFUSED localhost');
  assert.deepEqual(f.map(x => x.type), ['typescript', 'test', 'network']);
  assert.ok(f.every(x => x.suggestion));
});
test('returns empty diagnostics for successful log', () => {
  assert.deepEqual(diagnoseLog('All tests passed'), []);
});
test('redacts credentials in extracted evidence', () => {
  const f = diagnoseLog('permission denied Bearer secretvalue123');
  assert.equal(f.length, 1);
  assert.doesNotMatch(f[0].evidence, /secretvalue123/);
});
