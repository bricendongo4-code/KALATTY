import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const script = new URL('./developer-pr-plan.mjs', import.meta.url).pathname;
async function run(manifest) {
  const dir = await mkdtemp(join(tmpdir(), 'kalatty-pr-plan-'));
  const input = join(dir, 'manifest.json');
  await writeFile(input, JSON.stringify(manifest));
  const result = spawnSync(process.execPath, [script, input, dir], { encoding: 'utf8' });
  return { dir, result };
}
test('creates draft PR plan with human authorization gate', async () => {
  const { dir, result } = await run({ file: 'backend/src/auth/auth.service.ts', status: 'requires-human-review', applied: false });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(await readFile(join(dir, 'pr-plan.json'), 'utf8'));
  assert.equal(plan.draft, true);
  assert.equal(plan.status, 'awaiting-explicit-authorization');
  assert.ok(plan.blockedOperations.includes('merge'));
});
test('rejects changes to workflows and migrations', async () => {
  const { result } = await run({ file: '.github/workflows/ci.yml', status: 'requires-human-review', applied: false });
  assert.notEqual(result.status, 0);
});
test('rejects already applied patches', async () => {
  const { result } = await run({ file: 'frontend/app/page.tsx', status: 'requires-human-review', applied: true });
  assert.notEqual(result.status, 0);
});
