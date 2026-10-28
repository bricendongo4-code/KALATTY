import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const script = new URL('./developer-triage.mjs', import.meta.url).pathname;
async function run(findings) {
  const dir = await mkdtemp(join(tmpdir(), 'kalatty-triage-'));
  const input = join(dir, 'qa.json');
  await writeFile(input, JSON.stringify({ findings }));
  const result = spawnSync(process.execPath, [script, input, dir], { encoding: 'utf8' });
  const plan = result.status === 0 ? JSON.parse(await readFile(join(dir, 'triage-plan.json'), 'utf8')) : null;
  return { result, plan };
}
test('selects actionable QA findings and keeps writes disabled', async () => {
  const { result, plan } = await run([
    { severity: 'high', category: 'typescript', message: 'Compilation failed' },
    { severity: 'low', category: 'cosmetic', message: 'Minor warning' },
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(plan.candidateCount, 1);
  assert.equal(plan.candidates[0].automaticExecutionAllowed, false);
  assert.equal(plan.guardrails.defaultBranchWrites, false);
});
test('accepts real QA report priority and step fields', async () => {
  const { plan } = await run([{ priority: 'high', job: 'backend', step: 'Build failed' }]);
  assert.equal(plan.candidateCount, 1);
  assert.equal(plan.candidates[0].category, 'Build failed');
});
test('handles missing or empty findings', async () => {
  const { plan } = await run([]);
  assert.equal(plan.status, 'no-actionable-findings');
});
test('caps work to ten candidates', async () => {
  const { plan } = await run(Array.from({ length: 15 }, () => ({ severity: 'medium', category: 'test' })));
  assert.equal(plan.candidateCount, 10);
});
