/**
 * Conservative diagnostics for GitHub Actions logs.
 * Never persist raw logs or send them to an LLM.
 */
export function redact(text) {
  return String(text ?? '')
    .replace(/gh[pousr]_[A-Za-z0-9_]{15,}/g, '[REDACTED_GITHUB_TOKEN]')
    .replace(/sk-[A-Za-z0-9_-]{15,}/g, '[REDACTED_API_KEY]')
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')
    .replace(/(password|secret|token|api[_-]?key)\s*[:=]\s*[^\s]+/gi, '$1=[REDACTED]')
    .replace(/https?:\/\/[^\s@]+:[^\s@]+@/gi, '[REDACTED_CREDENTIAL_URL]');
}
export function diagnoseLog(raw, maxLines = 12) {
  const lines = String(raw ?? '').split(/\r?\n/);
  const patterns = [
    { type: 'dependency', regex: /npm ERR!|ERESOLVE|Cannot find module|Module not found/i, suggestion: 'Inspect dependency lockfiles and npm ci output.' },
    { type: 'typescript', regex: /error TS\d+|Type error:/i, suggestion: 'Review TypeScript compiler diagnostics and affected source files.' },
    { type: 'test', regex: /FAIL\s|AssertionError|expect\(.+\).*failed|Test timeout/i, suggestion: 'Reproduce the failed test locally with the same runtime.' },
    { type: 'build', regex: /Build failed|Failed to compile|Compilation failed/i, suggestion: 'Inspect build configuration and preceding compiler output.' },
    { type: 'permission', regex: /permission denied|403 Forbidden|insufficient permissions/i, suggestion: 'Verify CI token scopes and access policies without exposing credentials.' },
    { type: 'network', regex: /ETIMEDOUT|ECONNREFUSED|ENOTFOUND|network timeout/i, suggestion: 'Check service availability and whether the test requires external dependencies.' },
  ];
  const findings = [];
  for (const line of lines) {
    for (const pattern of patterns) {
      if (pattern.regex.test(line) && !findings.some(f => f.type === pattern.type)) {
        findings.push({ type: pattern.type, suggestion: pattern.suggestion });
      }
    }
    if (findings.length >= maxLines) break;
  }
  return findings;
}
