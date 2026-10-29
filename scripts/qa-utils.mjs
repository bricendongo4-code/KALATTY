/** Pure helpers for QA triage. No network or production access. */
export function clean(value) {
  return String(value ?? '').replace(/[\r\n|]/g, ' ').replace(/</g, '&lt;').slice(0, 180);
}
export function severity(name) {
  if (/security|auth|payment|rls|permission/i.test(name)) return 'high';
  if (/build|test|end-to-end|playwright|jest/i.test(name)) return 'medium';
  return 'low';
}
export function collectFindings(jobs) {
  const failed = jobs.flatMap(job => {
    const failedSteps = (job.steps ?? []).filter(step => ['failure', 'timed_out'].includes(step.conclusion));
    if (!failedSteps.length && ['failure', 'timed_out'].includes(job.conclusion)) {
      return [{ job: job.name, step: 'Job failed (no step detail)', url: job.html_url }];
    }
    return failedSteps.map(step => ({ job: job.name, step: step.name, url: job.html_url }));
  });
  return failed.map((item, i) => ({
    id: `QA-${String(i + 1).padStart(3, '0')}`,
    priority: severity(`${item.job} ${item.step}`),
    ...item,
    status: 'requires investigation',
  }));
}
