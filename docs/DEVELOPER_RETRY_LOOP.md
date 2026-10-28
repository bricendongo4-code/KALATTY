# Developer Agent — Bounded correction verification

`scripts/developer-retry-loop.mjs` runs a fixed allowlisted test suite, with a hard ceiling of three attempts and a 120-second timeout per test execution. It rejects arbitrary commands, runs without a shell, writes `retry-report.json`, and never merges or deploys.

**Current limitation:** it does not yet generate a revised code candidate after a failing test. It stops after the first failed run instead of blindly repeating the same failing command. A real autonomous correction loop requires a sandboxed code-editing worker, isolated test environment, regression tests, a trusted approval boundary for privileged operations, and a bounded re-planning step. This file is a verification scaffold, not a fully autonomous self-repair system.

The QA workflow also runs `developer-triage.mjs` to convert actual QA report fields (`priority`, `step`) into candidate investigation plans. The workflow is only active as a `workflow_run` trigger once the workflow is present on the repository's default branch.
