import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const script = new URL('./developer-execution-gate.mjs', import.meta.url).pathname;
const plan = { status: 'awaiting-explicit-authorization', draft: true, baseBranch: 'master', proposedBranch: 'ai/fix/auth-service-ts', allowedFiles: ['backend/src/auth.service.ts'] };
const approval = { approved: true, approvedBy: 'reviewer_1', branch: plan.proposedBranch, file: plan.allowedFiles[0], patchSha256: createHash('sha256').update('example patch').digest('hex') };
async function run(p, a) {
  const dir = await mkdtemp(join(tmpdir(), 'kalatty-gate-'));
  const pPath = join(dir, 'plan.json'), aPath = join(dir, 'approval.json');
  await writeFile(pPath, JSON.stringify(p));
  await writeFile(aPath, JSON.stringify(a));
  const patchPath = join(dir, 'proposed.patch');
  await writeFile(patchPath, 'example patch');
  const result = spawnSync(process.execPath, [script, pPath, aPath, dir, patchPath], { encoding: 'utf8' });
  return { result, dir };
}
test('requires a patch-bound human approval', async () => {
  const { result, dir } = await run(plan, approval);
  assert.equal(result.status, 0, result.stderr);
  const receipt = JSON.parse(await readFile(join(dir, 'execution-receipt.json'), 'utf8'));
  assert.equal(receipt.mergeAllowed, false);
  assert.equal(receipt.productionDeployAllowed, false);
});
test('rejects missing approval', async () => {
  const { result } = await run(plan, { ...approval, approved: false });
  assert.notEqual(result.status, 0);
});
test('rejects mismatched branch', async () => {
  const { result } = await run(plan, { ...approval, branch: 'master' });
  assert.notEqual(result.status, 0);
});
test('rejects missing patch hash', async () => {
  const { result } = await run(plan, { ...approval, patchSha256: '' });
  assert.notEqual(result.status, 0);
});

test('rejects a tampered patch even with a well-formed digest', async () => {
  const { result } = await run(plan, { ...approval, patchSha256: 'a'.repeat(64) });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /does not match approved SHA-256/);
});
