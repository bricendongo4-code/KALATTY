#!/usr/bin/env node
/**
 * Developer Agent v4: validate a review-only execution request.
 * No git, GitHub API, code mutation, or deployment.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash, timingSafeEqual } from 'node:crypto';
const [planPath = 'developer-reports/pr-plan.json', approvalPath = 'developer-reports/approval.json', outDir = 'developer-reports', patchPath = 'developer-reports/proposed.patch'] = process.argv.slice(2);
const plan = JSON.parse(await readFile(planPath, 'utf8'));
const approval = JSON.parse(await readFile(approvalPath, 'utf8'));
if (plan.status !== 'awaiting-explicit-authorization' || plan.draft !== true || plan.baseBranch !== 'master' ||
    !/^ai\/fix\/[a-z0-9-]+$/.test(plan.proposedBranch) ||
    !Array.isArray(plan.allowedFiles) || plan.allowedFiles.length !== 1 ||
    !/^(frontend|backend)\/[a-zA-Z0-9_./-]+\.(ts|tsx|js|jsx|css)$/.test(plan.allowedFiles[0]) ||
    plan.allowedFiles[0].split('/').includes('..')) {
  throw new Error('Invalid or unsafe execution plan');
}
if (approval.approved !== true || approval.branch !== plan.proposedBranch ||
    approval.file !== plan.allowedFiles[0] || typeof approval.approvedBy !== 'string' ||
    !/^[a-zA-Z0-9_-]{2,50}$/.test(approval.approvedBy) ||
    !/^[a-f0-9]{64}$/.test(String(approval.patchSha256 ?? ''))) {
  throw new Error('Explicit, patch-specific authorization required');
}
const patch = await readFile(patchPath);
const digest = createHash('sha256').update(patch).digest('hex');
if (!timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(approval.patchSha256, 'hex'))) {
  throw new Error('Patch content does not match approved SHA-256 digest');
}
const receipt = {
  status: 'validated-for-manual-execution',
  approvedBy: approval.approvedBy,
  patchSha256: approval.patchSha256,
  branch: plan.proposedBranch,
  file: plan.allowedFiles[0],
  draftPRRequired: true,
  productionDeployAllowed: false,
  mergeAllowed: false,
  note: 'This receipt is not an authorization to merge. This program never performs GitHub writes.',
};
await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, 'execution-receipt.json'), JSON.stringify(receipt, null, 2));
console.log('Execution request validated for manual review. No code or GitHub changes made.');
