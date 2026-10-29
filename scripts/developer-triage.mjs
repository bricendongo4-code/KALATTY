#!/usr/bin/env node
/**
 * Autonomous QA -> Developer triage coordinator.
 * Consumes a QA report and selects actionable candidates, but NEVER writes code.
 * This deliberately separates diagnosis from privileged execution.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [qaPath = 'qa-reports/report.json', output = 'developer-reports'] = process.argv.slice(2);
const qa = JSON.parse(await readFile(qaPath, 'utf8'));
const findings = Array.isArray(qa.findings) ? qa.findings : [];
const actionable = findings.filter(f => f && typeof f === 'object' &&
  ['high', 'medium', 'critical'].includes(String(f.priority ?? f.severity).toLowerCase()) &&
  (typeof f.step === 'string' || typeof f.message === 'string' || typeof f.category === 'string'));
const candidates = actionable.slice(0, 10).map((finding, i) => ({
  id: `candidate-${i + 1}`,
  severity: String(finding.priority ?? finding.severity).toLowerCase(),
  category: String(finding.category ?? finding.step ?? 'unclassified').slice(0, 100),
  status: 'needs-reproduction',
  nextSteps: [
    'Reproduce the failure in an isolated environment',
    'Identify a minimal source-level fix',
    'Write a regression test that fails before the fix',
    'Apply the change only to an ai/fix/* branch',
    'Run regression tests, full CI, and review the draft PR',
  ],
  automaticExecutionAllowed: false,
}));
const plan = {
  version: 1,
  status: candidates.length ? 'awaiting-reproduction' : 'no-actionable-findings',
  candidateCount: candidates.length,
  candidates,
  guardrails: { defaultBranchWrites: false, productionDeploy: false, automaticMerge: false },
};
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'triage-plan.json'), JSON.stringify(plan, null, 2));
console.log(`Developer triage prepared ${candidates.length} candidate(s). No code changes performed.`);
