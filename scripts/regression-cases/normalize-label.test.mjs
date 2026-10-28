import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLabel } from '../../backend/src/ai-regression-demo.mjs';
test('normalizes labels consistently', () => {
  assert.equal(normalizeLabel('  Bonjour KALATTY  '), 'bonjour kalatty');
});
