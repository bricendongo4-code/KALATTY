# Kalatty QA Agent v1

Read-only GitHub Actions triage for CI failures.

## Current capability

- On completion of existing `CI` or `Kalatty AI - quality gate (read-only)` workflows, retrieve GitHub Actions jobs and failed steps.
- Produce Markdown and JSON reports as downloadable GitHub Actions artifacts.
- Assign **heuristic** priorities; these are not validated root causes.
- Optionally request an AI-written French triage summary using `KALATTY_QA_OPENAI_API_KEY` repository secret. Without that secret, deterministic reports still work.
- Does **not** change code, open PRs, modify issues, merge, deploy, or access production Supabase.

## Enablement

1. Review and merge this draft PR only after validating CI and deployment settings.
2. The `workflow_run` trigger starts working after the workflow is present on the default branch.
3. Optional: add the repository secret `KALATTY_QA_OPENAI_API_KEY` to enable LLM summaries. Never commit API keys.
4. Inspect the `Kalatty QA Agent - CI triage` workflow run artifact `kalatty-qa-report`.
5. To inspect an earlier run, manually launch the workflow and supply its numeric run ID.

## Security and limits

The workflow uses only `actions: read` and `contents: read`. It does not download or execute artifacts from untrusted pull requests. It checks out the default branch's script only. Job/step names are treated as untrusted data. The optional LLM receives limited job metadata, not source code or secrets.

The AI summary may be incorrect; developers must inspect the original logs. This initial version does not ingest logs, diagnose code-level causes, or run locally. GitHub Actions and optional model usage may incur costs. If checks never run, no report is generated.
