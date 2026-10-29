import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const script = new URL('./developer-patch.mjs', import.meta.url).pathname;
async function fixture(request) {
  const dir = await mkdtemp(join(tmpdir(), 'kalatty-patch-'));
  await mkdir(join(dir, 'backend', 'src'), { recursive: true });
  await writeFile(join(dir, 'backend/src/example.ts'), 'const answer = 1;\n');
  const requestPath = join(dir, 'request.json');
  await writeFile(requestPath, JSON.stringify(request));
  const result = spawnSync(process.execPath, [script, requestPath, join(dir, 'out')], { cwd: dir, encoding: 'utf8' });
  return { dir, result };
}
test('creates a patch without changing the source file', async () => {
  const { dir, result } = await fixture({ file: 'backend/src/example.ts', oldText: 'answer = 1', newText: 'answer = 2' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(await readFile(join(dir, 'backend/src/example.ts'), 'utf8'), 'const answer = 1;\n');
  const patch = await readFile(join(dir, 'out/proposed.patch'), 'utf8');
  assert.match(patch, /\+const answer = 2;/);
  assert.match(patch, /-const answer = 1;/);
});
test('rejects path traversal', async () => {
  const { result } = await fixture({ file: 'backend/../secrets.ts', oldText: 'a', newText: 'b' });
  assert.notEqual(result.status, 0);
});
test('rejects ambiguous replacements', async () => {
  const { result } = await fixture({ file: 'backend/src/example.ts', oldText: 'const', newText: 'let' });
  assert.equal(result.status, 0);
  const second = await fixture({ file: 'backend/src/example.ts', oldText: 'missing', newText: 'new' });
  assert.notEqual(second.result.status, 0);
});
