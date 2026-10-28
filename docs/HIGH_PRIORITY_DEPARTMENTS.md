# High-priority AI departments — operating contract

## Security
Runs read-only source scans and Supabase architecture checks. Static matches are review leads, not confirmed vulnerabilities. Tenant isolation, database RLS and production secrets require staging verification.

## QA
Reads GitHub Actions results and bounded failed-job logs, producing diagnostic reports without executing suggestions. CI must run on the integrated commit to establish confidence.

## UX/UI
`node scripts/ux-route-inventory.mjs frontend/app agent-reports` inventories Next.js page files and static button attributes. `node scripts/ux-agent.mjs agent-reports/route-inventory.json agent-reports` generates a review queue. Missing labels and handlers are heuristics: components, dynamic expressions and actual mobile behavior need browser review. No automatic code changes.

## Product
`node scripts/product-agent.mjs agent-config/product-backlog.json agent-reports` validates IDs, dependency references, priorities and readiness, producing a deterministic ordered backlog. Release blockers are explicitly represented and cannot be silently treated as complete.

## Release policy
No department can merge to master, deploy, approve its own work or override manual security checks. These are initial runnable agents, not a completed autonomous organization. Before release: verify CI, Supabase recovery template and public key, tenant isolation/RLS, frontend route behavior and human approval.
