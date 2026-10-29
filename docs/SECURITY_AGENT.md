# Kalatty Security Agent — Department 2

## Purpose
Audit potential risks in Kalatty's multi-tenant school-management and independent-course systems. Initial implementation is read-only, with no secret exfiltration, no automatic patching, no merging and no deployment.

## Priority review areas
1. **Institution isolation:** verify that each authenticated request scopes reads/writes to the user's institution; service-role database clients bypass RLS.
2. **Authorization:** check admin, academic staff, teacher, student, independent instructor, and independent learner privileges at the backend, not just UI.
3. **Supabase:** audit RLS policies, privileged keys, storage buckets, and signed URL authorization.
4. **Authentication:** JWT verification, session lifecycle, password reset, and role escalation.
5. **Privacy:** sensitive student records, uploaded documents, retention, audit logs and GDPR.
6. **API hardening:** validation, rate limiting, CORS, injection, error redaction.
7. **Deployment:** Vercel/Railway secrets, dependency advisories and least-privilege GitHub Actions.

## Delivered in v1
- `scripts/security-agent.mjs` scans backend source files and emits `security-reports/security-report.json`.
- Unit tests and a read-only GitHub Actions workflow.
- Findings are **review leads**, not verified vulnerabilities. No source snippets or credential values appear in the report.

## Next validation
Review flagged locations with surrounding authorization code, inventory all Supabase migrations and RLS policies, add authenticated multi-tenant integration tests, and prioritize confirmed findings. Do not activate auto-fixes before proof and authorization checks.
