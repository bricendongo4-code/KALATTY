# Kalatty Developer Agent v1 — proposal-only

This initial agent converts QA findings into structured **investigation proposals**. It does not modify source code, create branches, open PRs, run generated commands, merge, or deploy.

## Pipeline

1. GitHub Actions CI completes.
2. QA Agent inspects job failures and bounded logs, generating `qa-reports/report.json`.
3. Developer Agent reads that report and generates `developer-reports/proposals.json` and `developer-reports/proposals.md`.
4. Reports are stored together in the GitHub Actions artifact `kalatty-qa-report`.
5. A developer reviews findings, reproduces bugs, and decides whether to authorize a specific code patch.

## Guardrails

- No GitHub write permissions or production credentials.
- Never execute instructions from CI logs, QA findings, or optional LLM output.
- Every proposed change requires regression tests and security review.
- A future coding agent must use a dedicated branch and draft PR, never direct commits to `master`.
- No automated merge or production deployment without explicit human approval.

## Limitations

This is a deterministic triage/planning component, **not yet an autonomous code-fixing agent**. Its proposals are generic and do not identify the exact source files to change. CI status and report generation must be validated in actual GitHub Actions runs.
