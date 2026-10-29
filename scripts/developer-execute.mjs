#!/usr/bin/env node
/**
 * Controlled developer executor. Must be invoked from a trusted environment.
 * Reads a reviewed exact-replacement request and opens a draft PR.
 * Never merges or deploys. Requires GITHUB_TOKEN with contents:write and pull-requests:write.
 */
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const [requestPath, approvalPath] = process.argv.slice(2);
if (!requestPath || !approvalPath) throw new Error('Usage: node scripts/developer-execute.mjs request.json approval.json');
const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (!/^[\w.-]+\/[\w.-]+$/.test(repo ?? '') || !token) throw new Error('Missing repository or token');
const request = JSON.parse(await readFile(requestPath, 'utf8'));
const approval = JSON.parse(await readFile(approvalPath, 'utf8'));
const file = String(request.file ?? '');
if (!/^(frontend|backend)\/[a-zA-Z0-9_./-]+\.(ts|tsx|js|jsx|css)$/.test(file) || file.split('/').includes('..')) throw new Error('Path not allowed');
if (typeof request.oldText !== 'string' || typeof request.newText !== 'string' || !request.oldText ||
    request.oldText === request.newText || request.oldText.length > 5000 || request.newText.length > 5000) throw new Error('Invalid replacement');
const requestBytes = await readFile(requestPath);
const digest = createHash('sha256').update(requestBytes).digest('hex');
if (approval.approved !== true || approval.requestSha256 !== digest || approval.file !== file ||
    !/^[a-zA-Z0-9_-]{2,50}$/.test(String(approval.approvedBy ?? ''))) throw new Error('Exact request approval required');
const base = process.env.DEVELOPER_AGENT_BASE_BRANCH || 'master';
if (base !== 'master') throw new Error('Base branch must be master');
const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
async function api(path, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${repo}/${path}`, {
    ...options, headers: { ...headers, ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : {};
}
const ref = await api('git/ref/heads/master');
const baseSha = ref.object.sha;
const current = await api(`contents/${file}?ref=${baseSha}`);
if (current.type !== 'file' || current.encoding !== 'base64') throw new Error('Not a supported source file');
const original = Buffer.from(current.content.replace(/\s/g, ''), 'base64').toString('utf8');
if (original.split(request.oldText).length !== 2) throw new Error('Target text must occur exactly once');
const updated = original.replace(request.oldText, request.newText);
const slug = file.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 40).toLowerCase();
const branch = `ai/fix/${slug}-${digest.slice(0, 10)}`;
await api('git/refs', { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }) });
await api(`contents/${file}`, { method: 'PUT', body: JSON.stringify({
  message: `fix(ai): approved isolated correction for ${file}`,
  content: Buffer.from(updated).toString('base64'), sha: current.sha, branch,
}) });
const pr = await api('pulls', { method: 'POST', body: JSON.stringify({
  title: `fix(ai): reviewed correction for ${file}`, head: branch, base: 'master', draft: true,
  body: `## Controlled Developer Agent correction\n\n- File: \`${file}\`\n- Approved request SHA-256: \`${digest}\`\n- Declared reviewer: \`${approval.approvedBy}\`\n\n**Review required:** run CI and targeted regression tests. No automatic merge or deployment.\n\nApproval identity must be verified by the trusted caller.`,
}) });
console.log(JSON.stringify({ branch, pullRequest: pr.html_url, draft: true, merged: false }));
