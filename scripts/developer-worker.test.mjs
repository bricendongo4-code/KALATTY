import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const script = new URL('./developer-worker.mjs', import.meta.url).pathname;
async function run(request) {
  const dir = await mkdtemp(join(tmpdir(), 'kalatty-worker-test-'));
  await mkdir(join(dir, 'backend/src'), { recursive: true });
  await writeFile(join(dir, 'backend/src/demo.js'), 'const answer = 1;\n');
  const input = join(dir, 'request.json');
  const output = join(dir, 'out');
  await writeFile(input, JSON.stringify(request));
  const result = spawnSync(process.execPath, [script, input, output], { cwd: dir, encoding: 'utf8' });
  return { dir, output, result };
}
test('stages corrected candidate without modifying original', async () => {
  const { dir, output, result } = await run({ file: 'backend/src/demo.js', oldText: 'answer = 1', newText: 'answer = 2' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(await readFile(join(dir, 'backend/src/demo.js'), 'utf8'), 'const answer = 1;\n');
  const report = JSON.parse(await readFile(join(output, 'worker-report.json'), 'utf8'));
  assert.equal(report.status, 'syntax-check-passed');
  assert.equal(report.eligibleForDraftPR, false);
  assert.match(await readFile(report.isolatedCandidate, 'utf8'), /answer = 2/);
});
test('rejects unsafe paths', async () => {
  const { result } = await run({ file: '../.github/workflows/ci.yml', oldText: 'a', newText: 'b' });
  assert.notEqual(result.status, 0);
});
test('rejects a syntax-breaking candidate', async () => {
  const { output, result } = await run({ file: 'backend/src/demo.js', oldText: 'const answer = 1;', newText: 'const = ;' });
  assert.notEqual(result.status, 0);
  const report = JSON.parse(await readFile(join(output, 'worker-report.json'), 'utf8'));
  assert.equal(report.status, 'syntax-check-failed');
});
