import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const script = new URL('./developer-promotion-gate.mjs', import.meta.url).pathname;
async function evaluate(report) {
  const dir = await mkdtemp(join(tmpdir(), 'kalatty-promotion-'));
  const request = join(dir, 'request.json');
  const pipeline = join(dir, 'pipeline.json');
  await writeFile(request, JSON.stringify({ file: 'backend/src/main.ts', oldText: 'a', newText: 'b' }));
  await writeFile(pipeline, JSON.stringify(report));
  const result = spawnSync(process.execPath, [script, request, pipeline, dir], { encoding: 'utf8' });
  return { result, decision: JSON.parse(await readFile(join(dir, 'promotion-gate.json'), 'utf8')) };
}
const passing = { status: 'candidate-checks-passed', file: 'backend/src/main.ts', steps: [
  { name: 'stage-candidate', passed: true, exitCode: 0 },
  { name: 'project-validation', passed: true, exitCode: 0 },
] };
test('passing generic checks still require regression and review', async () => {
  const { result, decision } = await evaluate(passing);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(decision.genericChecksPassed, true);
  assert.equal(decision.draftPrAuthorized, false);
  assert.equal(decision.regressionVerified, false);
});
test('rejects missing or forged step evidence', async () => {
  const { result, decision } = await evaluate({ ...passing, steps: [passing.steps[0]] });
  assert.notEqual(result.status, 0);
  assert.equal(decision.status, 'blocked');
});
test('rejects a report for a different file', async () => {
  const { result, decision } = await evaluate({ ...passing, file: 'frontend/app/page.tsx' });
  assert.notEqual(result.status, 0);
  assert.equal(decision.genericChecksPassed, false);
});
