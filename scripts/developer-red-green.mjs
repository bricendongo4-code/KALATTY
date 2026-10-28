#!/usr/bin/env node
/**
 * Narrow red/green probe for a candidate replacement.
 * Proves a targeted source invariant, not runtime behavior.
 */
import { readFile, mkdir, writeFile, realpath, lstat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
const [requestPath, output = 'developer-reports'] = process.argv.slice(2);
if (!requestPath) throw new Error('Usage: node scripts/developer-red-green.mjs request.json [output]');
const bytes = await readFile(requestPath);
const req = JSON.parse(bytes.toString('utf8'));
const file = String(req.file ?? '');
if (!/^(backend|frontend)\/[a-zA-Z0-9_./-]+\.(ts|tsx|js|jsx|css)$/.test(file) ||
  file.split('/').includes('..') || file.includes('//')) throw new Error('Unsafe path');
const root = await realpath(resolve('.'));
const target = await realpath(resolve(file));
if (!target.startsWith(root + sep)) throw new Error('Source escapes repository');
const stat = await lstat(resolve(file));
if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Invalid source');
const { oldText, newText, expectedInvariant } = req;
if (typeof oldText !== 'string' || !oldText || typeof newText !== 'string' ||
  !newText || oldText === newText || oldText.length > 5000 || newText.length > 5000) throw new Error('Invalid replacement');
if (typeof expectedInvariant !== 'string' || expectedInvariant.length < 5 ||
  expectedInvariant.length > 300 || expectedInvariant.trim() !== expectedInvariant) throw new Error('Missing source invariant');
const original = await readFile(resolve(file), 'utf8');
if (original.split(oldText).length !== 2) throw new Error('Exact replacement must match once');
const candidate = original.replace(oldText, newText);
const baselinePassed = original.includes(expectedInvariant);
const candidatePassed = candidate.includes(expectedInvariant);
const verified = !baselinePassed && candidatePassed;
const report = {
  status: verified ? 'source-invariant-red-green' : 'source-invariant-unproven',
  file,
  requestSha256: createHash('sha256').update(bytes).digest('hex'),
  baselinePassed, candidatePassed, sourceInvariantVerified: verified,
  behavioralRegressionProven: false,
  draftPrAuthorized: false,
  note: 'Source-level red/green is not a behavioral regression test. No execution of candidate code is performed.',
};
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'red-green-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
if (!verified) process.exitCode = 1;
