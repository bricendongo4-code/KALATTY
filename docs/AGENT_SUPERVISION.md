# Agent supervision and owner decisions

The NestJS supervisor wakes every minute and claims an hourly lease in Supabase.
Monitoring runs without a browser session and without OpenAI credits. It reads
aggregate counts for all eleven departments, a schema-only RLS exposure check, GitHub CI for master and HTTP status
for the public home and login pages. These probes do not prove authenticated
journeys, payment handling or complete application correctness.

Owner endpoints use the existing JWT guard plus a confirmed Supabase Auth identity
matching KALATTY_PLATFORM_ADMIN_EMAIL. Browser clients have no direct access to
supervision tables or RPCs. Runs, decisions, deduplication and the shared daily AI
quota persist across backend restarts and replicas. An interrupted lease expires
in fifteen minutes. A failed correction can be retried from the approval screen;
a crashed correction worker can be reclaimed after fifteen minutes.

AI analysis is disabled by default. Enable it in Control Center settings after
funding the API. Manual and autonomous analysis share twelve reserved calls per
UTC day. This is a request cap, not a monetary spending cap; configure a provider
budget too. Failed provider calls consume a reservation. Each automated analysis
has a bounded input/output and timeout. Evidence contains counts and check states,
not student, payment or message records. The developer agent additionally inspects
one eligible source file per cycle, rotated daily. No claims of full-code review.

## Deployment

1. Apply backend/migrations/20261103_ai_supervision.sql and 20261103_ai_security_signals.sql after the proposals migration.
2. Deploy this backend and frontend together. Disable Railway sleep mode so hourly monitoring runs without incoming browser traffic.
3. Existing OPENAI_API_KEY, KALATTY_AI_MODEL and KALATTY_PLATFORM_ADMIN_EMAIL remain
   server-side. FRONTEND_URL defaults to https://kalatty-frontend.vercel.app;
   probes accept only the explicit Kalatty hostname allowlist.
4. Set KALATTY_AGENT_GITHUB_TOKEN on the backend to a fine-grained token scoped to
   bricendongo4-code/KALATTY, with contents and pull requests write, checks/actions
   read. Do not use a NEXT_PUBLIC variable. Without it, monitoring can still read
   the public repository but approved correction preparation fails visibly.
5. Inspect Control Center > Settings > latest runs; start a free control manually
   if needed. Activate paid AI analysis only when ready.

## Approval and release

A proposal displays evidence, source file, exact old/new text and SHA-256 digest.
Approving a recommendation records a decision. Approving a code correction queues
only that stored patch. No client can submit executable patches through the
proposal creation endpoint. Path restrictions exclude workflow, auth, billing,
Supabase configuration and agent code. A patch must match exactly once at its
source revision; changed target code is refused rather than silently rebased.

The worker commits only the approved replacement on ai/approved/<proposal-id> and
opens a draft PR. Retrying recovers that deterministic branch/PR. CI runs on the
PR. The owner can then explicitly publish from the Control Center: backend and
frontend CI must succeed, no check may be pending/failing, and the PR head must
match the prepared SHA. GitHub branch protections still apply. A successful merge
is reported separately from a successful deployment; configured Vercel/Railway
pipelines handle deployment. No agent independently publishes a change.

Revision requests with comments are included in the department's next AI review.
Business agents provide recommendations; they do not message users, change prices,
initiate payments or alter customer records.
