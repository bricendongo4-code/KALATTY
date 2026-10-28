#!/usr/bin/env node
/**
 * Developer pipeline orchestrator: safe local verification and PR readiness.
 * It does NOT call the write-capable GitHub executor.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const [requestPath, output = 'developer-reports'] = process.argv.slice(2);
if (!requestPath) throw new Error('Usage: node scripts/developer-pipeline.mjs request.json [output]');
const req = JSON.parse(await readFile(requestPath, 'utf8'));
const file = String(req.file ?? '');
if (!/^(frontend|backend)\/[a-zA-Z0-9_./-]+\.(ts|tsx|js|jsx|css)$/.test(file) ||
    file.split('/').includes('..')) throw new Error('Unsafe path');
const steps = [];
function step(name, script, args) {
  const run = spawnSync(process.execPath, [script, ...args], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 600000,
    maxBuffer: 128 * 1024, shell: false,
    env: { ...process.env, GITHUB_TOKEN: '', CI: 'true' },
  });
  steps.push({ name, passed: run.status === 0 && !run.error, exitCode: run.status,
    timedOut: run.error?.code === 'ETIMEDOUT' });
  return steps.at(-1).passed;
}
await mkdir(output, { recursive: true });
const staged = step('stage-candidate', 'scripts/developer-worker.mjs', [requestPath, output]);
const validated = staged && step('project-validation', 'scripts/developer-validate.mjs', [requestPath, output]);
const report = {
  status: validated ? 'candidate-checks-passed' : 'candidate-checks-failed',
  file, steps, draftPRCreated: false, sourceTreeModified: false,
  eligibleForAutomaticMerge: false, deployed: false,
  note: 'Passing generic checks is not proof that a bug is fixed. A targeted regression test and CI review are required.',
};
await writeFile(resolve(output, 'pipeline-report.json'), JSON.stringify(report, null, 2));
const promoted = validated && step('promotion-evidence', 'scripts/developer-promotion-gate.mjs', [requestPath, resolve(output, 'pipeline-report.json'), output]);
console.log(JSON.stringify(report));
if (!validated || !promoted) process.exitCode = 1;
