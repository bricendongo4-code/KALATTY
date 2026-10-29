#!/usr/bin/env node
/**
 * Review-only branch/PR plan. Does not call GitHub APIs or mutate source.
 * The plan is an input to a future separately authorized write-capable service.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [manifestPath = 'developer-reports/patch-manifest.json', output = 'developer-reports'] = process.argv.slice(2);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const file = String(manifest.file ?? '');
if (!/^(frontend|backend)\/[a-zA-Z0-9_./-]+\.(ts|tsx|js|jsx|css)$/.test(file) || file.split('/').includes('..') || manifest.applied !== false || manifest.status !== 'requires-human-review') {
  throw new Error('Invalid or unsafe patch manifest');
}
const slug = file.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 55).toLowerCase();
const branch = `ai/fix/${slug}`;
const plan = {
  status: 'awaiting-explicit-authorization',
  baseBranch: 'master',
  proposedBranch: branch,
  proposedTitle: `fix: review proposed change to ${file}`,
  draft: true,
  allowedFiles: [file],
  instructions: [
    'Human reviews proposed.patch and authorizes this specific change.',
    'Create a new branch from the latest master, never commit directly to master.',
    'Apply only the reviewed patch to the allowlisted file.',
    'Run project tests, build and security checks.',
    'Open a draft PR with test results; do not merge or deploy.',
  ],
  blockedOperations: ['merge', 'deploy', 'production secrets', 'database migrations', 'workflow changes'],
};
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'pr-plan.json'), JSON.stringify(plan, null, 2));
console.log(`Prepared review-only PR plan for ${file}; no GitHub mutations performed.`);
