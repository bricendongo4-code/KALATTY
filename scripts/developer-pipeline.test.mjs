import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const script = new URL('./developer-pipeline.mjs', import.meta.url).pathname;
async function run(request) {
  const dir = await mkdtemp(join(tmpdir(), 'kalatty-pipeline-'));
  const input = join(dir, 'request.json');
  await writeFile(input, JSON.stringify(request));
  return spawnSync(process.execPath, [script, input, dir], { encoding: 'utf8', timeout: 10000 });
}
test('rejects workflow modification requests', async () => {
  const result = await run({ file: '.github/workflows/ci.yml', oldText: 'a', newText: 'b' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unsafe path/);
});
test('rejects traversal requests', async () => {
  const result = await run({ file: 'backend/../frontend/app/page.tsx', oldText: 'a', newText: 'b' });
  assert.notEqual(result.status, 0);
});
