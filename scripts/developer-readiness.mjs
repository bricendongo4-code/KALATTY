#!/usr/bin/env node
/**
 * Read-only readiness assessment; never opens a PR or authorizes a merge.
 * Evidence files are local and NOT authenticated attestations.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const [requestPath, behavioralPath, output = 'developer-reports'] = process.argv.slice(2);
if (!requestPath || !behavioralPath) throw new Error('Usage: node scripts/developer-readiness.mjs request.json behavioral-report.json [output]');
const bytes = await readFile(requestPath);
const request = JSON.parse(bytes.toString('utf8'));
const evidence = JSON.parse(await readFile(behavioralPath, 'utf8'));
const digest = createHash('sha256').update(bytes).digest('hex');
const file = String(request.file ?? '');
if (!/^(backend|frontend)\/[a-zA-Z0-9_./-]+\.(js|mjs|cjs)$/.test(file) ||
    file.split('/').includes('..') || file.includes('//')) throw new Error('Unsafe candidate path');
const verified = evidence.status === 'behavioral-red-green-proven' &&
  evidence.file === file &&
  evidence.testCase === request.behavioralTest &&
  evidence.requestSha256 === digest &&
  evidence.behavioralRegressionProven === true &&
  evidence.baseline?.passed === false &&
  evidence.candidate?.passed === true;
const report = {
  status: verified ? 'evidence-consistent-review-required' : 'blocked',
  file, requestSha256: digest, behavioralEvidenceConsistent: verified,
  evidenceAuthenticated: false, draftPrAuthorized: false,
  mergeAuthorized: false, deployAuthorized: false,
  note: verified
    ? 'Local evidence is internally consistent, but can be forged. Independent trusted CI and repository-scoped authorization are required before a draft PR.'
    : 'Evidence is missing, mismatched, or does not show a failing baseline and passing candidate.',
};
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'readiness-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
if (!verified) process.exitCode = 1;
