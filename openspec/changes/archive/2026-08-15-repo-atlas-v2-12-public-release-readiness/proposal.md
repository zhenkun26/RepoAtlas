## Why

RepoAtlas has a mature session-only analysis and change-proposal boundary, but the repository is not yet ready to be handed to outside contributors as a public project. It lacks an explicit license, community and security guidance, a current README/release posture, and repeatable CI gates. The package is intentionally private and source-first, so the next release-readiness step must establish those facts without implying that npm publication or a compiled distribution already exists.

## What Changes

- Add an MIT license and public-project governance documents for contributions, conduct, security reports, and change history.
- State the project attribution policy: MIT use is allowed, while public references and integrations should identify RepoAtlas and link the source repository; redistributed copies retain the MIT notice.
- Update README and Harness integration guidance to describe the current v2 lifecycle, source-first installation, supported Node versions, and explicit non-goals.
- Add a release checklist that separates repository readiness from separately authorized tag, publish, and push actions.
- Add GitHub Actions CI for Node 22 and 24 with dependency-lock, test, lint, typecheck, OpenSpec, and diff checks.
- Add public repository metadata while keeping `private: true` until the npm/package distribution decision is made.
- Extend the roadmap with the v2.12 baseline and bounded v2.13/v2.14 follow-up work.

## Capabilities

### New Capabilities

- `public-release-readiness`: source-first public release governance, documentation, metadata, and automated quality gates.

### Modified Capabilities

<!-- Runtime lifecycle and safety capabilities are unchanged. -->

## Impact

- Affected files: root legal/community documents, `README.md`, `NOTICE.md`, `CHANGELOG.md`, `package.json`, `.github/workflows/ci.yml`, `docs/release-checklist.md`, `docs/roadmap.md`, and related Harness documentation.
- No runtime TypeScript behavior, session registry, proposal lifecycle, evidence cache, event history, preflight, or release action changes.
- No new runtime dependency, network capability, persistence, source workspace write, commit, push, deployment, or package publication.
- MIT is approved as the project license. Public references follow the separate provenance policy in `NOTICE.md`; the named copyright holder still needs confirmation before the first public release.
