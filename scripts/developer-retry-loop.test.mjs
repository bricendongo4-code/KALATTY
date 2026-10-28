import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const script = new URL('./developer-retry-loop.mjs', import.meta.url).pathname;
async function run(config) {
  const dir = await mkdtemp(join(tmpdir(), 'kalatty-retry-'));
  const input = join(dir, 'config.json');
  await writeFile(input, JSON.stringify(config));
  const result = spawnSync(process.execPath, [script, input, dir], {
    encoding: 'utf8', timeout: 180000,
  });
  return { result, dir };
}
test('rejects shell command injection via testSuite', async () => {
  const { result } = await run({ testSuite: 'node -e "process.exit(0)"', maxAttempts: 3 });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /not allowlisted/);
});
test('rejects unbounded retry attempts', async () => {
  const { result } = await run({ testSuite: 'agent-unit', maxAttempts: 100 });
  assert.notEqual(result.status, 0);
});
test('executes approved test suite and writes a report', async () => {
  const { result, dir } = await run({ testSuite: 'agent-unit', maxAttempts: 3 });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(await readFile(join(dir, 'retry-report.json'), 'utf8'));
  assert.equal(report.status, 'tests-passed');
  assert.equal(report.attempts.length, 1);
  assert.equal(report.merged, false);
});
