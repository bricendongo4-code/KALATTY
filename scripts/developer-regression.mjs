#!/usr/bin/env node
/**
 * Check a specific regression command inside a disposable project copy.
 * The command is selected from a static allowlist, never from user-supplied shell.
 * This is a local check, not a security sandbox.
 */
import { readFile, writeFile, mkdir, mkdtemp, cp, realpath, lstat } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const [requestPath, output = 'developer-reports'] = process.argv.slice(2);
if (!requestPath) throw new Error('Usage: node scripts/developer-regression.mjs request.json [output]');
const req = JSON.parse(await readFile(requestPath, 'utf8'));
const file = String(req.file ?? '');
if (!/^(backend|frontend)\/[a-zA-Z0-9_./-]+\.(ts|tsx|js|jsx|css)$/.test(file) ||
    file.split('/').includes('..') || file.includes('//')) throw new Error('Disallowed file');
if (typeof req.oldText !== 'string' || typeof req.newText !== 'string' ||
    !req.oldText || req.oldText === req.newText || req.oldText.length > 5000 || req.newText.length > 5000) throw new Error('Invalid replacement');
const project = file.startsWith('backend/') ? 'backend' : 'frontend';
const allowed = project === 'backend' ? ['backend-jest'] : ['frontend-playwright'];
if (!allowed.includes(req.regressionSuite)) throw new Error('Regression suite is not allowlisted');
const root = await realpath(resolve('.'));
const actual = await realpath(resolve(file));
if (!actual.startsWith(root + sep)) throw new Error('Source escapes repository');
const stat = await lstat(resolve(file));
if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Invalid source');
const original = await readFile(resolve(file), 'utf8');
if (original.split(req.oldText).length !== 2) throw new Error('Exact replacement must match once');
const temp = await mkdtemp(join(tmpdir(), 'kalatty-regression-'));
const isolated = join(temp, project);
await cp(resolve(project), isolated, {
  recursive: true, force: false,
  filter: async path => {
    const entry = await lstat(path);
    return !entry.isSymbolicLink() && !/(^|\/)(node_modules|\.next|dist|coverage|\.git)(\/|$)/.test(path);
  },
});
await writeFile(join(temp, file), original.replace(req.oldText, req.newText));
const commands = [['npm', ['ci']]];
if (project === 'backend') commands.push(['npm', ['test', '--', '--runInBand', '--passWithNoTests']]);
else commands.push(['npm', ['run', 'test:e2e']]);
const checks = [];
for (const [command, args] of commands) {
  const run = spawnSync(command, args, {
    cwd: isolated, shell: false, encoding: 'utf8', timeout: 180000,
    maxBuffer: 128 * 1024,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, CI: 'true', NEXT_PUBLIC_API_BASE_URL: 'http://localhost:4000' },
  });
  checks.push({ command: [command, ...args].join(' '), passed: run.status === 0 && !run.error, exitCode: run.status });
  if (!checks.at(-1).passed) break;
}
const result = {
  status: checks.every(c => c.passed) ? 'regression-suite-passed' : 'regression-suite-failed',
  file, suite: req.regressionSuite, checks,
  targetedRegressionProven: false,
  note: 'An existing test suite passing is not proof that the original bug was reproduced before the fix.',
  draftPrAuthorized: false,
};
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'regression-report.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
if (result.status !== 'regression-suite-passed') process.exitCode = 1;
