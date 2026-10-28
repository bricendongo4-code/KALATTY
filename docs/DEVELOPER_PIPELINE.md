# Developer Agent pipeline — first integration

`node scripts/developer-pipeline.mjs request.json developer-reports`

The pipeline coordinates two previously independent components:
1. `developer-worker.mjs` stages an exact replacement in a temporary directory.
2. `developer-validate.mjs` applies the replacement to a separate copy of the affected project, then runs project-specific npm checks.

It records `pipeline-report.json`. GitHub credentials are removed from the subprocess environment. The pipeline **does not** invoke `developer-execute.mjs`, open a PR, merge, or deploy. It also does not generate a fix autonomously or retry with new code after a failed check.

**Activation criteria:** integration-test this pipeline with an actual representative Kalatty correction, implement isolated containers for dependency scripts, verify targeted regression tests, and provide an authenticated approval interface for the write-capable executor. Until then this is a manually triggered experimental pipeline.
