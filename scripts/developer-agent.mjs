#!/usr/bin/env node
/**
 * Kalatty Developer Agent v1: produces a reviewable, non-executable
 * development proposal from a QA report. No repository writes or deployment.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';

const source = process.argv[2] || 'qa-reports/report.json';
const output = process.argv[3] || 'developer-reports';
const raw = JSON.parse(await readFile(source, 'utf8'));
if (!Array.isArray(raw.findings)) throw new Error('Invalid QA report: findings array missing');
const allowed = ['high', 'medium', 'low'];
const actions = {
  high: 'Reproduce in isolation, add a regression test, review authorization and data boundaries, then propose a minimal patch.',
  medium: 'Reproduce the failing test, inspect relevant source and dependencies, and propose a narrowly scoped fix with regression tests.',
  low: 'Verify whether the issue is reproducible and document a minimal safe change.',
};
const proposals = raw.findings.slice(0, 50).map((f, index) => {
  const priority = allowed.includes(f.priority) ? f.priority : 'medium';
  return {
    id: `DEV-${String(index + 1).padStart(3, '0')}`,
    qaId: String(f.id ?? '').slice(0, 30),
    priority,
    summary: `Investigate failing CI job ${String(f.job ?? '').slice(0, 100)}`,
    diagnosticStep: String(f.step ?? '').slice(0, 100),
    plan: actions[priority],
    requiredChecks: ['Unit/regression tests', 'Security review', 'Human approval'],
    status: 'proposal-only',
  };
});
const clean = s => String(s).replace(/[\r\n|]/g, ' ').replace(/</g, '&lt;');
const md = [
  '# Kalatty Developer Agent — proposed work',
  '',
  '> Proposals only. No code was changed, no PR was opened, and no deployment was triggered.',
  '',
  `- Source workflow run: ${/^\d+$/.test(String(raw.runId)) ? raw.runId : 'unknown'}`,
  `- Proposed investigations: ${proposals.length}`,
  '',
  ...proposals.flatMap(p => [
    `## ${p.id} — ${p.priority}`,
    '',
    `- QA finding: ${clean(p.qaId)}`,
    `- Summary: ${clean(p.summary)}`,
    `- Failed step: ${clean(p.diagnosticStep)}`,
    `- Plan: ${p.plan}`,
    '- Gate: regression tests + security review + explicit human approval',
    '',
  ]),
  ...(proposals.length ? [] : ['No failed CI steps to investigate.', '']),
].join('\n');
await mkdir(output, { recursive: true });
await writeFile(`${output}/proposals.json`, JSON.stringify({ sourceRunId: raw.runId, proposals }, null, 2));
await writeFile(`${output}/proposals.md`, md);
console.log(`Prepared ${proposals.length} proposal(s). No repository mutations performed.`);
