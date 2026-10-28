# Kalatty — AI quality gate (phase 1)

This is a **read-only CI foundation**, not an autonomous AI coding agent. It does not call an LLM, change application code, connect to production services, merge pull requests, or deploy.

## How it works

- On pull requests targeting `master` that change frontend/backend code, GitHub Actions runs backend build/Jest and frontend lint/build/Playwright.
- It can also be launched manually from Actions using `workflow_dispatch`.
- All checks run on GitHub-hosted runners without production credentials.
- Playwright reports are saved as artifacts on failure when available.
- Existing `CI` workflow remains in place.

## Approval policy (option B)

1. Future AI coding agents may propose changes on a dedicated branch and open a pull request.
2. They must not merge, deploy, modify production data, or execute production migrations.
3. A human reviews the diff, security implications, test results, and migration plan before approving.
4. Enforce branch protection/rulesets for `master`: require reviews and passing checks; disable direct pushes and auto-merge for automation identities.
5. Verify Vercel/Railway Git integrations and deployment triggers before enabling any agent with write permissions.
6. Use least-privilege GitHub credentials and separate test credentials; never give agents production Supabase service-role keys.

## Next milestones

- Add tests for cross-institution authorization, role escalation, course access, and payment demo-mode isolation.
- Add dependency/security checks and a coverage baseline.
- Create an issue triage agent with read-only access to CI logs and user-reported incidents.
- Later add a coding agent with branch-only write access, isolated execution, and mandatory PR review.

## Limitations

CI passing is not proof that production is secure or working. The checks here have not yet been verified on GitHub Actions. Existing test coverage is incomplete; production environment settings, RLS policies, and deployment triggers require separate audits.
