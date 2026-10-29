import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('creates review-only development proposals from QA findings', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kalatty-dev-agent-'));
  const input = join(dir, 'report.json');
  const output = join(dir, 'out');
  await writeFile(input, JSON.stringify({ runId: '123', findings: [{ id: 'QA-001', priority: 'high', job: 'Backend', step: 'Auth tests' }] }));
  const result = spawnSync(process.execPath, ['scripts/developer-agent.mjs', input, output], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const data = JSON.parse(await readFile(join(output, 'proposals.json'), 'utf8'));
  assert.equal(data.proposals[0].status, 'proposal-only');
  assert.match(data.proposals[0].plan, /regression test/);
});
test('rejects malformed input rather than guessing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kalatty-dev-agent-'));
  const input = join(dir, 'invalid.json');
  await writeFile(input, '{}');
  const result = spawnSync(process.execPath, ['scripts/developer-agent.mjs', input, join(dir, 'out')], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
});
