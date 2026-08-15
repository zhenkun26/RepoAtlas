# repo-atlas-ci-lint-portability

Fix the CI failure caused by `scripts/lint.mjs` requiring the runner-local `rg` executable.

The change keeps the safety lint scope and forbidden-token rules unchanged and replaces only the file enumeration dependency with Node.js standard-library traversal.
