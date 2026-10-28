#!/usr/bin/env node
/**
 * Read-only promotion gate for a developer candidate.
 * Never calls GitHub or authorizes a merge.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const [requestPath, pipelinePath, output = 'developer-reports'] = process.argv.slice(2);
if (!requestPath || !pipelinePath) throw new Error('Usage: node scripts/developer-promotion-gate.mjs request.json pipeline-report.json [output]');
const bytes = await readFile(requestPath);
const request = JSON.parse(bytes.toString('utf8'));
const pipeline = JSON.parse(await readFile(pipelinePath, 'utf8'));
const file = String(request.file ?? '');
if (!/^(backend|frontend)\/[a-zA-Z0-9_./-]+\.(ts|tsx|js|jsx|css)$/.test(file) ||
    file.split('/').includes('..') || file.includes('//')) throw new Error('Disallowed file');
const checks = Array.isArray(pipeline.steps) ? pipeline.steps : [];
const expected = ['stage-candidate', 'project-validation'];
const checksPassed = checks.length === expected.length &&
  checks.every((step, index) => step.name === expected[index] && step.passed === true && step.exitCode === 0);
const verified = pipeline.status === 'candidate-checks-passed' && pipeline.file === file && checksPassed;
const result = {
  version: 1,
  status: verified ? 'awaiting-targeted-regression-and-review' : 'blocked',
  file,
  requestSha256: createHash('sha256').update(bytes).digest('hex'),
  genericChecksPassed: verified,
  regressionVerified: false,
  draftPrAuthorized: false,
  automaticMergeAllowed: false,
  productionDeployAllowed: false,
  reason: verified
    ? 'Generic project checks passed. A targeted regression test, authenticated authorization and independent CI are still required.'
    : 'Pipeline report is incomplete, failed, or does not match the request.',
};
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'promotion-gate.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
if (!verified) process.exitCode = 1;
