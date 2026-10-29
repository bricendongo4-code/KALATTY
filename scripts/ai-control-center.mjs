#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';

const [manifestPath, outputDir = 'agent-reports'] = process.argv.slice(2);
if (!manifestPath) throw Error('Usage: ai-control-center.mjs <manifest.json> [out]');

const manifestFile = resolve(manifestPath);
const data = JSON.parse(await readFile(manifestFile, 'utf8'));
if (!Array.isArray(data.reports)) throw Error('reports must be an array');
const allowed = new Set(['security', 'qa', 'ux', 'product', 'marketing', 'sales', 'support', 'finance', 'analytics', 'crm', 'developer']);
const departments = [];
const seen = new Set();
const errors = [];

for (const entry of data.reports) {
  if (!entry || !allowed.has(entry.department) || typeof entry.file !== 'string' || !entry.file.trim()) {
    throw Error('Invalid report entry');
  }
  if (seen.has(entry.department)) throw Error('Duplicate department: ' + entry.department);
  seen.add(entry.department);
  // Resolve relative paths from the manifest directory, not the process working directory.
  const file = isAbsolute(entry.file) ? entry.file : resolve(dirname(manifestFile), entry.file);
  try {
    const report = JSON.parse(await readFile(file, 'utf8'));
    if (!report || typeof report !== 'object' || Array.isArray(report)) throw Error('Invalid report payload');
    if (report.department && report.department !== entry.department) throw Error('Report department mismatch');
    const findings = Array.isArray(report.findings) ? report.findings.length : 0;
    const queue = Array.isArray(report.queue) ? report.queue.length : 0;
    const reviewRequired = findings > 0 || queue > 0 || report.approvalRequiredForMerge === true;
    departments.push({
      department: entry.department,
      status: 'reported',
      findings,
      queue,
      source: entry.file,
      dataMode: data.synthetic === true ? 'synthetic' : 'unverified',
      reviewRequired,
      externalActionsPerformed: report.externalActionsPerformed === true,
    });
  } catch (error) {
    errors.push({ department: entry.department, code: 'REPORT_UNAVAILABLE', message: error instanceof Error ? error.message : 'Unknown report error' });
    departments.push({
      department: entry.department,
      status: 'error',
      findings: 0,
      queue: 0,
      source: entry.file,
      dataMode: data.synthetic === true ? 'synthetic' : 'unverified',
      reviewRequired: true,
      externalActionsPerformed: false,
    });
  }
}
const summary = {
  total: departments.length,
  reported: departments.filter(item => item.status === 'reported').length,
  errors: errors.length,
  reviewRequired: departments.filter(item => item.reviewRequired).length,
};
const result = {
  version: 2,
  generatedAt: new Date().toISOString(),
  dataMode: data.synthetic === true ? 'synthetic' : 'unverified',
  summary,
  departments,
  errors,
  allDepartmentsVerified: false,
  mergeAuthorized: false,
  deployAuthorized: false,
  liveMonitoringEnabled: false,
};
await mkdir(resolve(outputDir), { recursive: true });
await writeFile(join(resolve(outputDir), 'control-center.json'), JSON.stringify(result, null, 2));
console.log('Control center loaded ' + summary.reported + '/' + summary.total + ' reports (' + summary.errors + ' errors)');
if (summary.errors > 0) process.exitCode = 1;
