import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const script = new URL('./developer-red-green.mjs', import.meta.url).pathname;
async function evaluate(overrides) {
  const dir = await mkdtemp(join(tmpdir(), 'kalatty-red-green-'));
  const request = join(dir, 'request.json');
  const data = { file: 'backend/src/main.ts', oldText: 'async function bootstrap() {',
    newText: 'async function bootstrap() {\n  // Isolated developer validation smoke test.',
    expectedInvariant: '// Isolated developer validation smoke test.', ...overrides };
  await writeFile(request, JSON.stringify(data));
  const run = spawnSync(process.execPath, [script, request, dir], { encoding: 'utf8' });
  const report = JSON.parse(await readFile(join(dir, 'red-green-report.json'), 'utf8'));
  return { run, report };
}
test('proves source invariant absent before and present after', async () => {
  const { run, report } = await evaluate({});
  assert.equal(run.status, 0, run.stderr);
  assert.equal(report.baselinePassed, false);
  assert.equal(report.candidatePassed, true);
  assert.equal(report.behavioralRegressionProven, false);
});
test('rejects invariant that already passed on baseline', async () => {
  const { run, report } = await evaluate({ expectedInvariant: 'async function bootstrap() {' });
  assert.notEqual(run.status, 0);
  assert.equal(report.sourceInvariantVerified, false);
});
