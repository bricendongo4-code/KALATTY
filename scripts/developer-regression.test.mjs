import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const script = new URL('./developer-regression.mjs', import.meta.url).pathname;
async function run(req) {
  const dir = await mkdtemp(join(tmpdir(), 'kalatty-regression-test-'));
  const input = join(dir, 'request.json');
  await writeFile(input, JSON.stringify(req));
  return spawnSync(process.execPath, [script, input, dir], { encoding: 'utf8', timeout: 10000 });
}
test('rejects unapproved regression commands', async () => {
  const result = await run({ file: 'backend/src/main.ts', oldText: 'a', newText: 'b', regressionSuite: 'npm run malicious' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /not allowlisted/);
});
test('rejects path traversal before executing npm', async () => {
  const result = await run({ file: 'backend/../frontend/app/page.tsx', oldText: 'a', newText: 'b', regressionSuite: 'frontend-playwright' });
  assert.notEqual(result.status, 0);
});
