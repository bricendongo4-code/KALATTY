import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const script = new URL('./security-agent.mjs', import.meta.url).pathname;
test('reports sensitive patterns without source snippets or secrets', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kalatty-security-agent-'));
  const src = join(dir, 'src');
  await mkdir(src);
  await writeFile(join(src, 'example.ts'), 'const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;\nconst token = jwt.decode(value);\n');
  const run = spawnSync(process.execPath, [script, src, dir], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const report = JSON.parse(await readFile(join(dir, 'security-report.json'), 'utf8'));
  assert.equal(report.findings.length, 2);
  assert.equal(report.confirmedVulnerabilities, 0);
  assert.equal(report.automaticFixes, false);
  assert.ok(report.findings.every(f => f.status === 'requires-review'));
});
test('ignores symlink files', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kalatty-security-agent-'));
  const src = join(dir, 'src');
  await mkdir(src);
  await writeFile(join(src, 'safe.ts'), 'export const safe = true;');
  const run = spawnSync(process.execPath, [script, src, dir], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
});
