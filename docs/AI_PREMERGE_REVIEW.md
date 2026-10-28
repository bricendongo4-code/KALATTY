# Pre-merge technical review — AI department integration

## Branch chain
master -> ai/quality-gate-foundation -> ai/security-agent-foundation -> ai/high-priority-departments -> ai/remaining-departments-foundation.

The isolated SHA-256 patch verification fix from ai/fix/verify-patch-hash was copied to the integration branch. No merge or production deployment is authorized.

## Confirmed workflow results
- AI Department Foundations: successful after generating its synthetic QA fixture at runtime.
- Remaining AI Departments: successful after generating its synthetic Control Center manifest at runtime.
These are synthetic/unit checks, not functional proof of live agents.

## Required before merge
- Review all code changes and ensure CI backend/frontend compilation and tests pass on the **integration head** (not just older ancestor commits).
- Verify tenant scoping, authorization and password-recovery flow; independent review for privileged Supabase operations.
- Prepare Supabase recovery email template with token_hash and type=recovery; ensure URL allowlist matches.
- Confirm Railway backend public/publishable Supabase key (SUPABASE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY). Do not expose service-role credentials.
- Resolve deployment environment dependencies before promoting to production.
- Explicit owner approval for merge and separately for deployment.

## Deferred until approved staging deployment
- Live browser UX checks, realistic QA failures and end-to-end agent coordination.
- Data-source integrations for Marketing, Sales, Support, Finance, Analytics and CRM.
- End-to-end recovery token consumption and expiry tests.

## Known limits
The Control Center currently aggregates static reports; it is not a live dashboard or scheduler. The business agents are read-only processors, not autonomous live operators. Security scanner findings are heuristic and not proof of vulnerability or safety.
