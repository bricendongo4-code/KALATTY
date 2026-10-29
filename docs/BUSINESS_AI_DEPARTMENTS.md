# Kalatty — Business AI departments and Control Center

## Current implementation
Marketing, Sales, Support, Finance, Analytics and CRM have deterministic read-only processors in `scripts/business-department-agent.mjs`. Each accepts a JSON input with a `records` array and writes an aggregate report with no raw customer records. `scripts/ai-control-center.mjs` loads an explicit manifest of department reports and produces a single read-only overview.

## Example
`node scripts/business-department-agent.mjs support agent-config/business-demo.json agent-reports`

The example data is synthetic and does not demonstrate a live integration. Real connections to Supabase, customer messaging, payment providers, sales pipelines or analytics collection have **not** been implemented.

## Governance
These agents must not autonomously send campaigns, contact leads, alter billing, close tickets, update CRM, merge code or deploy. Financial outputs are indicative and not reconciled. Analytics inputs must be anonymized before processing. Customer-facing actions need separate authenticated integrations, tenant-scoped authorization and human approval.

## Validation before release
Run Node tests and smoke workflow on the branch. Validate data contracts, privacy, roles, audit logs and tenant separation before connecting live data. Functional validation follows approved merge and staging rollout. Do not treat synthetic tests as proof of production readiness.
