#!/usr/bin/env node
/**
 * Read-only static security triage for common tenant-boundary hazards.
 * Findings are leads for review, not confirmed vulnerabilities.
 */
import { readdir, readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
const [root = 'backend/src', output = 'developer-reports'] = process.argv.slice(2);
const findings = [];
const patterns = [
  { id: 'service-role', regex: /SUPABASE_SERVICE_ROLE_KEY|service_role/gi, severity: 'high',
    advice: 'Verify tenant and role authorization before any service-role query.' },
  { id: 'unsafe-raw-query', regex: /\$queryRawUnsafe|\$executeRawUnsafe/gi, severity: 'high',
    advice: 'Verify query parameterization and caller permissions.' },
  { id: 'unverified-jwt', regex: /jwt\.decode\s*\(/gi, severity: 'high',
    advice: 'Ensure tokens are cryptographically verified, not only decoded.' },
];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) { await walk(path); continue; }
    if (!stat.isFile() || !/\.(ts|tsx|js|mjs)$/.test(entry.name)) continue;
    const body = await readFile(path, 'utf8');
    for (const pattern of patterns) {
      for (const match of body.matchAll(pattern.regex)) {
        const line = body.slice(0, match.index).split('\n').length;
        findings.push({ id: pattern.id, file: relative(resolve('.'), resolve(path)), line,
          severity: pattern.severity, status: 'review-required', advice: pattern.advice });
      }
    }
  }
}
await walk(resolve(root));
const report = { status: 'static-triage-completed', scanRoot: root,
  findings, confirmedVulnerabilities: 0,
  note: 'Pattern matches are not proof of exploitation or missing authorization. Human review required.',
  autoFixAllowed: false, automaticMergeAllowed: false, productionDeployAllowed: false };
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'security-triage.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: report.status, findings: findings.length }));
