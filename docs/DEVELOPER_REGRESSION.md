# Developer pipeline — regression suite phase

The pipeline now runs three verification stages before generating promotion evidence:

1. Stage the exact-text candidate in a disposable directory.
2. Run project install/build/test checks on a separate copy.
3. Run an allowlisted regression suite on another separate copy.

The backend suite is Jest, and the frontend suite is Playwright. Neither accepts arbitrary shell commands. The smoke fixture uses `backend-jest`.

**Crucial limitation:** the existing test suite passing does not establish that a specific bug was reproduced and fixed. The regression report deliberately sets `targetedRegressionProven: false`, and the promotion gate still refuses to authorize draft PR creation. Running npm scripts in a temporary copy is not a hardened sandbox.

A later stage must demonstrate a red test on the unmodified baseline and a green test after the candidate change, with both runs tied to the same exact request digest, before an automated PR can be considered.
