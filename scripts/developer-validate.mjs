#!/usr/bin/env node
/**
 * Validate a prepared candidate inside a disposable local checkout.
 * No GitHub write operations, merges or deployments.
 */
import { readFile, writeFile, mkdir, mkdtemp, cp, realpath, lstat } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const [requestPath, output = 'developer-reports'] = process.argv.slice(2);
if (!requestPath) throw new Error('Usage: node scripts/developer-validate.mjs request.json [output]');
const req = JSON.parse(await readFile(requestPath, 'utf8'));
const file = String(req.file ?? '');
if (!/^(frontend|backend)\/[a-zA-Z0-9_./-]+\.(ts|tsx|js|jsx|css)$/.test(file) ||
    file.split('/').includes('..') || file.includes('//')) throw new Error('Unsafe path');
if (typeof req.oldText !== 'string' || typeof req.newText !== 'string' || !req.oldText ||
    req.oldText === req.newText || req.oldText.length > 5000 || req.newText.length > 5000) throw new Error('Invalid replacement');
const project = file.startsWith('backend/') ? 'backend' : 'frontend';
const source = resolve(project);
const actualRoot = await realpath(resolve('.'));
const actualFile = await realpath(resolve(file));
if (!actualFile.startsWith(actualRoot + sep)) throw new Error('Symlink escapes repository');
const sourceStat = await lstat(resolve(file));
if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) throw new Error('Source must be a regular file');
const original = await readFile(resolve(file), 'utf8');
if (original.split(req.oldText).length !== 2) throw new Error('Exact replacement must match once');
const temp = await mkdtemp(join(tmpdir(), 'kalatty-validation-'));
const isolated = join(temp, project);
await cp(source, isolated, {
  recursive: true, force: false,
  filter: async path => {
    const stat = await lstat(path);
    return !stat.isSymbolicLink() && !/(^|\/)(node_modules|\.next|dist|coverage|\.git)(\/|$)/.test(path);
  },
});
const target = join(temp, file);
await writeFile(target, original.replace(req.oldText, req.newText));
const commands = project === 'backend'
  ? [['npm', ['ci']], ['npm', ['run', 'build']], ['npm', ['test', '--', '--runInBand', '--passWithNoTests']]]
  : [['npm', ['ci']], ['npm', ['run', 'lint']], ['npm', ['run', 'build']]];
const results = [];
for (const [command, args] of commands) {
  const run = spawnSync(command, args, {
    cwd: isolated, shell: false, encoding: 'utf8', timeout: 180000,
    maxBuffer: 128 * 1024, env: {
      PATH: process.env.PATH, HOME: process.env.HOME, CI: 'true',
      NEXT_PUBLIC_API_BASE_URL: 'http://localhost:4000',
    },
  });
  results.push({ command: [command, ...args].join(' '), passed: run.status === 0 && !run.error,
    exitCode: run.status, timedOut: run.error?.code === 'ETIMEDOUT',
    outputAvailable: Boolean(run.stdout || run.stderr),
  });
  if (!results.at(-1).passed) break;
}
const report = {
  status: results.every(r => r.passed) ? 'project-checks-passed' : 'project-checks-failed',
  project, file, checks: results,
  originalSourceModified: false, regressionTestProvided: false,
  eligibleForAutomaticMerge: false, deployed: false,
};
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'validation-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: report.status, checks: results.map(({command, passed}) => ({command, passed})) }));
if (report.status !== 'project-checks-passed') process.exitCode = 1;
