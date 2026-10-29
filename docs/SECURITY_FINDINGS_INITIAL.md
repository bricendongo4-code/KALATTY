# Security Agent — initial findings from code review

## SA-001 — Supabase authentication client privileged fallback (high-priority review)

**Location:** `backend/src/supabase/supabase.service.ts`

Observed: `authClient` is instantiated with `publicKey ?? serviceRoleKey!`. If the public key is absent, the client receives the privileged service-role key.

**Risk:** the authentication client can be initialized with credentials exceeding its intended privilege level. This is a configuration hazard; exploitation is not established.

**Recommended correction (requires configuration check):** require a publishable/anon key for `authClient` and fail startup if absent; reserve service-role credentials for explicitly privileged backend operations. Verify Railway environment variables first.

## SA-002 — Privileged database client and tenant boundaries (high-priority review)

**Location:** `backend/src/supabase/supabase.service.ts`; consumers include `backend/src/institutions/institutions.service.ts` and `backend/src/campus/campus.service.ts`.

Observed: `client` prefers the service-role key. Supabase service-role queries bypass RLS, so service-level authorization is essential. The institution and campus services include explicit membership and role checks in inspected methods; this review does not establish whether every method is adequately protected.

**Recommended validation:** inventory every privileged read/write endpoint, identify institution IDs derived from request input, and add negative tests proving user A cannot read/write institution B resources.

## SA-003 — Password reset authorization flow (review needed)

**Location:** `backend/src/auth/auth.service.ts`

Observed: `resetPassword` calls `authClient.auth.getUser(accessToken)` and then privileged `auth.admin.updateUserById`. Verify the recovery-token flow and token purpose; a valid generic access token may not be sufficient proof of an authorized password-recovery action.

**Recommended validation:** write an integration test that attempts reset with a normal session access token and requires denial, then verify a legitimate recovery flow. Do not alter production authentication before the behavior is reproduced and a safe replacement is designed.

## Scope and limits

These are source-review findings, **not confirmed exploitable vulnerabilities**. No production keys or user records were accessed. No database policy has been modified. Security workflows remain read-only.
