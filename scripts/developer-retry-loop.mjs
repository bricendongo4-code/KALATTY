#!/usr/bin/env node
/**
 * Bounded developer retry loop. Runs an explicit test command, not shell text
 * supplied by QA reports. The fix callback is an independently reviewed local
 * script. No GitHub write operations or production deployment.
 */
import { spawnSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [configPath = 'developer-reports/retry-config.json', output = 'developer-reports'] = process.argv.slice(2);
const config = JSON.parse(await readFile(configPath, 'utf8'));
const allowedCommands = {
  'agent-unit': ['node', ['--test',
    'scripts/qa-utils.test.mjs',
    'scripts/qa-log-analysis.test.mjs',
    'scripts/developer-agent.test.mjs',
    'scripts/developer-patch.test.mjs',
    'scripts/developer-pr-plan.test.mjs',
    'scripts/developer-execution-gate.test.mjs',
    'scripts/developer-execute.test.mjs',
    'scripts/developer-triage.test.mjs',
  ]],
};
if (!Object.hasOwn(allowedCommands, config.testSuite)) throw new Error('Test suite is not allowlisted');
const attempts = Number(config.maxAttempts ?? 3);
if (!Number.isInteger(attempts) || attempts < 1 || attempts > 3) throw new Error('Attempt limit must be 1–3');
const [command, args] = allowedCommands[config.testSuite];
const results = [];
for (let i = 1; i <= attempts; i++) {
  const run = spawnSync(command, args, {
    cwd: process.cwd(), encoding: 'utf8', timeout: 120000,
    maxBuffer: 512 * 1024, shell: false,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, CI: 'true' },
  });
  const passed = run.status === 0 && !run.error;
  results.push({ attempt: i, passed, exitCode: run.status, timedOut: run.error?.code === 'ETIMEDOUT' });
  if (passed) break;
  // This first version intentionally does not fabricate or apply a correction.
  // A future isolated worker must supply a verified new candidate between retries.
  break;
}
const report = {
  status: results.at(-1).passed ? 'tests-passed' : 'blocked-needs-new-candidate',
  testSuite: config.testSuite, attempts: results,
  note: 'A failed test cannot be solved by blind reruns. A new reviewed code candidate is required.',
  merged: false, deployed: false,
};
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'retry-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
if (!results.at(-1).passed) process.exitCode = 1;
