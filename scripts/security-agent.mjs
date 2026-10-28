#!/usr/bin/env node
/**
 * Kalatty Security Agent v1: static, read-only, conservative findings.
 * No network requests, no secrets in reports, no source writes.
 */
import { readdir, readFile, lstat, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
const [rootArg = 'backend/src', output = 'security-reports'] = process.argv.slice(2);
const root = resolve(rootArg);
const findings = [];
const rules = [
  { id: 'supabase-service-role', regex: /SUPABASE_SERVICE_ROLE_KEY|service_role/gi, severity: 'high', note: 'Review authorization and tenant scoping before privileged database access.' },
  { id: 'jwt-decode', regex: /\bjwt\.decode\s*\(/gi, severity: 'high', note: 'Decoding a JWT does not verify its signature.' },
  { id: 'unsafe-raw-query', regex: /\$(?:queryRawUnsafe|executeRawUnsafe)\s*\(/gi, severity: 'high', note: 'Review SQL injection and parameterization.' },
  { id: 'cors-wildcard', regex: /origin\s*:\s*['"`]\*['"`]/g, severity: 'medium', note: 'Review cross-origin access and credentials.' },
];
async function visit(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) { await visit(path); continue; }
    if (!stat.isFile() || !/\.(?:ts|tsx|js|mjs)$/.test(item.name)) continue;
    const source = await readFile(path, 'utf8');
    for (const rule of rules) {
      for (const match of source.matchAll(rule.regex)) {
        findings.push({ rule: rule.id, severity: rule.severity,
          file: relative(resolve('.'), path), line: source.slice(0, match.index).split('\n').length,
          status: 'requires-review', recommendation: rule.note });
      }
    }
  }
}
await visit(root);
findings.sort((a,b) => a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule));
const report = { version: 1, status: 'review-required', scannedRoot: rootArg,
  findings, counts: { high: findings.filter(x=>x.severity==='high').length, medium: findings.filter(x=>x.severity==='medium').length },
  confirmedVulnerabilities: 0, automaticFixes: false, automaticMerge: false, productionDeploy: false,
  limitations: 'Regex-based review leads only. Does not prove missing tenant checks, RLS correctness, or exploitable vulnerabilities.' };
await mkdir(output, { recursive: true });
await writeFile(join(resolve(output), 'security-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ findings: findings.length, ...report.counts }));
