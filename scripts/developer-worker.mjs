#!/usr/bin/env node
/**
 * Developer Worker v1 — isolated candidate verification.
 * Applies a bounded exact-text replacement to a disposable copy of ONE file.
 * Never edits the source tree, commits, merges, or deploys.
 */
import { readFile, writeFile, mkdir, mkdtemp, realpath, lstat } from 'node:fs/promises';
import { resolve, join, relative, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const [requestPath, output = 'developer-reports'] = process.argv.slice(2);
if (!requestPath) throw new Error('Usage: node scripts/developer-worker.mjs request.json [output]');
const req = JSON.parse(await readFile(requestPath, 'utf8'));
const file = String(req.file ?? '');
if (!/^(frontend|backend)\/[a-zA-Z0-9_./-]+\.(ts|tsx|js|jsx|css)$/.test(file) ||
    file.split('/').includes('..') || file.includes('//')) throw new Error('File is not allowlisted');
if (typeof req.oldText !== 'string' || typeof req.newText !== 'string' || !req.oldText ||
    req.oldText === req.newText || req.oldText.length > 5000 || req.newText.length > 5000) {
  throw new Error('Invalid replacement');
}
const root = resolve(process.cwd());
const originalPath = resolve(root, file);
if (!originalPath.startsWith(root + sep) || relative(root, originalPath).startsWith('..')) throw new Error('Unsafe path');
const realRoot = await realpath(root);
const realFile = await realpath(originalPath);
if (!realFile.startsWith(realRoot + sep)) throw new Error('Symlink escapes repository');
const fileStat = await lstat(originalPath);
if (fileStat.isSymbolicLink() || !fileStat.isFile()) throw new Error('Source must be a regular non-symlink file');
const original = await readFile(originalPath, 'utf8');
if (original.split(req.oldText).length !== 2) throw new Error('Replacement must match exactly once');
const candidate = original.replace(req.oldText, req.newText);
const workDir = await mkdtemp(join(tmpdir(), 'kalatty-worker-'));
const candidatePath = join(workDir, file);
await mkdir(resolve(candidatePath, '..'), { recursive: true });
await writeFile(candidatePath, candidate);
const check = spawnSync(process.execPath, ['--check', candidatePath], {
  encoding: 'utf8', timeout: 30000, shell: false, maxBuffer: 65536,
});
const supportedSyntaxCheck = /\.js$/.test(file);
const status = supportedSyntaxCheck
  ? (check.status === 0 ? 'syntax-check-passed' : 'syntax-check-failed')
  : 'syntax-check-not-applicable';
const report = {
  status,
  file,
  isolatedCandidate: candidatePath,
  sourceTreeModified: false,
  testEvidence: supportedSyntaxCheck ? { command: 'node --check', exitCode: check.status } : null,
  fullBuildPassed: false,
  regressionTestsPassed: false,
  eligibleForDraftPR: false,
  note: 'This worker only stages a candidate in a disposable directory. Full project tests require a sandboxed checkout.',
};
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'worker-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
if (status === 'syntax-check-failed') process.exitCode = 1;
