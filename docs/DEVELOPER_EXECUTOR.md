# Developer Agent — Controlled executor (experimental)

The script `scripts/developer-execute.mjs` is a **write-capable executor**, but is not connected to any scheduled workflow and has not been run against GitHub.

## Inputs

- `request.json`: `{ "file": "backend/src/example.ts", "oldText": "exact old text", "newText": "replacement" }`
- `approval.json`: `{ "approved": true, "approvedBy": "reviewer-id", "file": "backend/src/example.ts", "requestSha256": "<SHA-256 of exact request.json bytes>" }`
- Environment: `GITHUB_REPOSITORY`, `GITHUB_TOKEN` with `contents:write` and `pull-requests:write`.

Only invoke from a trusted environment after authenticating the reviewer and checking that the request was explicitly authorized. A user-supplied `approval.json` alone is **not** proof of identity or consent.

The script reads the latest `master`, creates a unique `ai/fix/*` branch, performs a single exact replacement, and opens a **draft PR**. It does not merge, deploy, modify workflow files or migrations, or access production secrets. If a later API step fails, an incomplete branch may remain and must be reviewed manually.

## Required before production use

1. Add a trusted authenticated approval interface with immutable request digest.
2. Validate executor behavior with mocked GitHub API integration tests.
3. Add a CI gate requiring backend/frontend build, unit tests, targeted regression tests, and security review.
4. Enforce branch protection and block any automatic production deploy from `ai/fix/*` branches.
5. Run an end-to-end dry-run on a test repository before granting write permissions.

**Do not enable unattended execution yet.** Passing CI is necessary but not sufficient evidence of bug resolution.
