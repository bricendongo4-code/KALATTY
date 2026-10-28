# Developer Worker v1 — isolated candidate staging

Run `node scripts/developer-worker.mjs request.json developer-reports` with an explicit request containing `file`, `oldText`, and `newText`.

The worker stages the replacement into a temporary directory, leaving the original source file unchanged. It runs `node --check` only for plain JavaScript files; TypeScript, TSX, JSX and CSS are **not** validated by that syntax check. The worker writes `worker-report.json`, and never opens a PR, merges, or deploys.

**Not yet safe for unattended execution on untrusted requests:** the worker reads a source file under a syntactically restricted path but does not currently reject symlink traversal; use only trusted, non-adversarial repository checkouts. A hardened sandbox must enforce filesystem containment and resource limits before autonomous execution.

A complete fix requires an isolated full checkout, regression tests proving the original bug, project build and CI, and a draft PR. This is an incremental staging component, not a complete autonomous coding agent.
