import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const script = new URL('./developer-readiness.mjs', import.meta.url).pathname;
const request = { file: 'backend/src/ai-regression-demo.mjs', behavioralTest: 'scripts/regression-cases/normalize-label.test.mjs' };
async function evaluate(change = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'kalatty-readiness-'));
  const reqPath = join(dir, 'request.json');
  const bytes = Buffer.from(JSON.stringify(request));
  await writeFile(reqPath, bytes);
  const evidence = { status: 'behavioral-red-green-proven', file: request.file,
    testCase: request.behavioralTest, requestSha256: createHash('sha256').update(bytes).digest('hex'),
    behavioralRegressionProven: true, baseline: { passed: false }, candidate: { passed: true }, ...change };
  const evidencePath = join(dir, 'evidence.json');
  await writeFile(evidencePath, JSON.stringify(evidence));
  const run = spawnSync(process.execPath, [script, reqPath, evidencePath, dir], { encoding: 'utf8' });
  const report = JSON.parse(await readFile(join(dir, 'readiness-report.json'), 'utf8'));
  return { run, report };
}
test('matching red-green evidence is reviewable but never authorizes a PR', async () => {
  const { run, report } = await evaluate();
  assert.equal(run.status, 0, run.stderr);
  assert.equal(report.behavioralEvidenceConsistent, true);
  assert.equal(report.evidenceAuthenticated, false);
  assert.equal(report.draftPrAuthorized, false);
});
test('rejects evidence tied to another request', async () => {
  const { run, report } = await evaluate({ requestSha256: '0'.repeat(64) });
  assert.notEqual(run.status, 0);
  assert.equal(report.status, 'blocked');
});
test('rejects passing baseline', async () => {
  const { run, report } = await evaluate({ baseline: { passed: true } });
  assert.notEqual(run.status, 0);
  assert.equal(report.behavioralEvidenceConsistent, false);
});
