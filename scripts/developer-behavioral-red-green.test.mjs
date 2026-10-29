import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const script = new URL('./developer-behavioral-red-green.mjs', import.meta.url).pathname;
const fixture = new URL('./fixtures/developer-behavioral-request.json', import.meta.url).pathname;
test('baseline fails and candidate passes the same executable test', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kalatty-behavior-test-'));
  const run = spawnSync(process.execPath, [script, fixture, dir], { encoding: 'utf8', timeout: 10000 });
  assert.equal(run.status, 0, run.stderr);
  const report = JSON.parse(await readFile(join(dir, 'behavioral-red-green-report.json'), 'utf8'));
  assert.equal(report.baseline.passed, false);
  assert.equal(report.candidate.passed, true);
  assert.equal(report.behavioralRegressionProven, true);
  assert.equal(report.draftPrAuthorized, false);
});
test('arbitrary test commands are rejected', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kalatty-behavior-test-'));
  const req = JSON.parse(await readFile(fixture, 'utf8'));
  req.behavioralTest = 'scripts/../../etc/passwd';
  const path = join(dir, 'request.json');
  await writeFile(path, JSON.stringify(req));
  const run = spawnSync(process.execPath, [script, path, dir], { encoding: 'utf8', timeout: 10000 });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /not allowlisted/);
});
