# Contributing to RepoAtlas

Thanks for helping improve RepoAtlas. The project is a security-bounded DeepSeek Harness plugin, so changes are reviewed for both behavior and authority boundaries.

## Development setup

- Node.js 22 or newer is required; CI checks Node.js 22 and 24.
- Install the locked dependencies with `npm ci`.
- Run the local gates before opening a pull request:

  ```bash
  npm test
  npm run lint
  npm run typecheck
  npm run validate:openspec
  git diff --check
  ```

  `npm run validate:openspec` requires the OpenSpec CLI. If it is not already available on `PATH`, use the pinned CLI explicitly:

  ```bash
  npx --yes @fission-ai/openspec@1.7.0 validate --all --strict --no-interactive
  ```

## Change boundaries

- Read `docs/security-boundary.md` before changing permissions, Git behavior, or Harness integration.
- New behavior requires a new OpenSpec change under `openspec/changes/`; do not silently extend an active or archived change.
- Keep evidence cache, proposal registry, lifecycle event history, and release/preflight assessments session-only.
- Do not add network, arbitrary Shell, dependency installation, source-workspace writes, remote Git, or persistence without a separately reviewed specification.
- Do not treat a proposal, patch, commit, preflight, or readiness observation as an applied result or authorization.

## Pull requests

Describe the user-visible result, the affected safety boundary, and the exact verification commands. Include relevant OpenSpec artifacts in the same pull request. Keep unrelated formatting or generated files out of the change.

The CI workflow is authoritative for the minimum gates. A failed or unavailable gate should be fixed or explained; it should not be bypassed by weakening tests, lint, type checks, or specs.

## Release work

RepoAtlas is currently source-first and `package.json` remains `private: true`. Follow [the release checklist](docs/release-checklist.md) for the separate decisions and approvals required before a tag, package publication, or public release. Public references and integrations should identify RepoAtlas / 代码星图 and link the source repository as described in [NOTICE](NOTICE.md).
