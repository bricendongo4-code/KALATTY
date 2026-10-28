#!/usr/bin/env node
/**
 * Execute the SAME standalone Node regression test against baseline and candidate.
 * Only tests in scripts/regression-cases are allowed; no arbitrary command strings.
 * A temporary copy is NOT a security sandbox.
 */
import { readFile, writeFile, mkdir, mkdtemp, cp, realpath, lstat } from 'node:fs/promises';
import { resolve, join, sep, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const [requestPath, output = 'developer-reports'] = process.argv.slice(2);
if (!requestPath) throw new Error('Usage: node scripts/developer-behavioral-red-green.mjs request.json [output]');
const bytes = await readFile(requestPath);
const req = JSON.parse(bytes.toString('utf8'));
const file = String(req.file ?? '');
const testCase = String(req.behavioralTest ?? '');
if (!/^(backend|frontend)\/[a-zA-Z0-9_./-]+\.(js|mjs|cjs)$/.test(file) ||
  file.split('/').includes('..') || file.includes('//')) throw new Error('Only plain JS candidate paths allowed');
if (!/^scripts\/regression-cases\/[a-zA-Z0-9_-]+\.test\.mjs$/.test(testCase)) throw new Error('Test case is not allowlisted');
const root = await realpath(resolve('.'));
for (const path of [file, testCase]) {
  const actual = await realpath(resolve(path));
  const stat = await lstat(resolve(path));
  if (!actual.startsWith(root + sep) || !stat.isFile() || stat.isSymbolicLink()) throw new Error('Invalid path');
}
const { oldText, newText } = req;
if (typeof oldText !== 'string' || !oldText || typeof newText !== 'string' ||
  !newText || oldText === newText || oldText.length > 5000 || newText.length > 5000) throw new Error('Invalid replacement');
const original = await readFile(resolve(file), 'utf8');
if (original.split(oldText).length !== 2) throw new Error('Exact replacement must match once');
const tmp = await mkdtemp(join(tmpdir(), 'kalatty-behavior-'));
const cases = [];
for (const label of ['baseline', 'candidate']) {
  const dest = join(tmp, label);
  await mkdir(dest);
  const source = join(dest, file);
  const test = join(dest, testCase);
  await mkdir(resolve(source, '..'), { recursive: true });
  await mkdir(resolve(test, '..'), { recursive: true });
  await writeFile(source, label === 'baseline' ? original : original.replace(oldText, newText));
  await cp(resolve(testCase), test);
  const run = spawnSync(process.execPath, ['--test', test], {
    cwd: dest, shell: false, encoding: 'utf8', timeout: 30000,
    maxBuffer: 128 * 1024,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, CI: 'true' },
  });
  cases.push({ label, passed: run.status === 0 && !run.error, exitCode: run.status });
}
const verified = !cases[0].passed && cases[1].passed;
const report = {
  status: verified ? 'behavioral-red-green-proven' : 'behavioral-red-green-unproven',
  file, testCase, requestSha256: createHash('sha256').update(bytes).digest('hex'),
  baseline: cases[0], candidate: cases[1],
  behavioralRegressionProven: verified,
  draftPrAuthorized: false, eligibleForAutomaticMerge: false, deployed: false,
  note: 'A red/green test is evidence for its own assertion only; it does not prove all functionality or security.',
};
await mkdir(output, { recursive: true });
await writeFile(join(resolve(output), 'behavioral-red-green-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
if (!verified) process.exitCode = 1;
