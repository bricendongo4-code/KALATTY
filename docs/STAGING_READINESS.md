# Kalatty — staging setup and release acceptance

Status: preparation only. **Never point staging at the production Supabase project.** No production deployment or automatic Git connection should be enabled by this document.

## Isolation requirements
- Create a **separate Supabase project** for staging with synthetic test users, data and storage. Do not copy live personal information or reuse production service-role keys.
- Create a **separate Railway service/environment** for the NestJS backend, with root directory `backend`, separate environment variables and a staging-only domain.
- Create a **separate Vercel project** for the Next.js frontend, with root directory `frontend`, staging-only environment variables and domain.
- Deploy only from `staging/preproduction-readiness` or an explicit staging commit. Do not reconnect the production services to GitHub as part of staging.
- Prefer manual initial deployments. Restrict access to staging and do not send real transactional messages or payments.

## Configuration inventory (values are secrets; never paste into tickets/chat)
Backend: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`), `CORS_ORIGINS` (exact staging frontend origin), `PORT` supplied by Railway.
Frontend: `NEXT_PUBLIC_API_BASE_URL` (staging Railway backend), and any Supabase public URL/publishable key referenced by frontend code. Inspect actual env usages before configuration.
Supabase staging Auth: Site URL = staging frontend origin; redirect allowlist includes staging frontend and `/reset-password`. Reset Password email template must use staging frontend URL with `?token_hash={{ .TokenHash }}&type=recovery`. **Do not change production email template yet.**

## Release acceptance checklist
1. Staging frontend/backend health and CORS.
2. Register, sign in, sign out; role access and navigation.
3. Password recovery email received; recovery link changes password once; consumed/expired/invalid token rejected; ordinary session token rejected.
4. Tenant isolation: users in institution A cannot access institution B resources, including direct API calls and Supabase RLS.
5. QA, Security, Developer, UX, Product and six business departments: check actual inputs, reports, permissions, failure behavior and any external integrations. CI synthetic fixture success alone is not live validation.
6. Verify notifications and external email providers use staging-only recipients. Disable real payments.
7. Rollback: record existing production Vercel deployment and Railway deployment IDs; test redeployment/revert procedure before production rollout.
8. Release coordination: update production Supabase recovery email template **in sync** with deployment of new frontend/backend; restore Git connections only with explicit production approval.

## Gates
- Current master CI passed at PR #12 premerge head; rerun/inspect after any staging changes.
- No production deployment without a separate explicit approval.
