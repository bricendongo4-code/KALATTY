# Kalatty Developer Agent v1 — proposal-only

The Developer Agent v1 converts QA findings into structured **investigation proposals**. It does not modify source code, create branches, open PRs, run generated commands, merge, or deploy.

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

## Patch proposal mode (v2)

The standalone `scripts/developer-patch.mjs` accepts an explicit JSON request containing `file`, `oldText`, and `newText`. It only accepts TypeScript/JavaScript/CSS files inside `frontend/` or `backend/`, and requires exactly one occurrence of the target text. It generates `proposed.patch` and `patch-manifest.json` without writing to the source file or GitHub.

This is **not** an autonomous code editor: a developer must decide what to change and supply the exact replacement. The diff format is intended for review and should not be applied automatically. The patch engine has unit tests in the PR quality gate.

## Draft PR planning (v3)

Run `node scripts/developer-pr-plan.mjs developer-reports/patch-manifest.json developer-reports` to generate a **review-only** `pr-plan.json` from a previously prepared patch manifest. The plan specifies a dedicated `ai/fix/*` branch, a draft PR, the exact allowed file, required tests, and explicit approval. It rejects migrations, GitHub workflows, and already applied patches. This phase intentionally does **not** create a branch or PR, apply a patch, or grant GitHub write permissions. A separate write-capable execution step must be designed and authorized before any such action.

## Approval gate (v4)

`scripts/developer-execution-gate.mjs` validates a separate `approval.json` against `pr-plan.json`. The approval must explicitly identify the same branch, file, approving reviewer, and a 64-character SHA-256 digest for the reviewed patch. It emits an `execution-receipt.json` for **manual execution only**; it does not create GitHub branches, commit changes, open PRs, merge, or deploy. The current gate validates hash **format**, not the patch bytes; a future execution service must independently compute and compare the digest against the exact patch before any write. Approval JSON must come from a trusted authenticated channel, not a PR artifact or user-controlled branch.
