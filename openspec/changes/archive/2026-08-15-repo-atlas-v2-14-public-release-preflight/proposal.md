## Why

v2.13 established the source-first distribution decision, packed artifact evaluation, and a successful smoke against the pinned public DeepSeek Harness revision. The remaining path to open-source practice is release governance: a support policy, a reproducible release procedure, and a preflight that proves the candidate is clean and synchronized without performing the release.

## What changes

- Record v2.13's successful pinned Harness smoke and README recheck in the public release checklist.
- Add a proposed first-release support policy for Node.js, the pinned Harness compatibility contract, issue/security handling, attribution, and explicit non-support claims.
- Add a source-first release procedure with human gates for copyright-holder confirmation, changelog-to-release-notes review, exact commit selection, tag/GitHub Release creation, and the continued no-npm posture.
- Add a read-only `verify:release-preflight` command that reports bounded `ready` or `blocked` facts from package metadata, required documents, checklist markers, active OpenSpec state, clean worktree state, and local `origin/main` ancestry.
- Add a manual release-preflight workflow that runs quality gates and the read-only preflight, without tag, release, publish, push, deployment, or runtime operations.
- Update the roadmap, README, security boundary, contribution guidance, changelog, and release checklist to preserve the separation between candidate readiness and release execution.

## Capabilities

### New Capabilities

- `public-release-preflight`: source-first support/release governance and read-only candidate validation.

## Impact

- Affected files: release documentation, preflight script/package metadata, manual workflow, roadmap/checklist/security/README guidance, and a new OpenSpec capability spec.
- No `src/` runtime behavior, Harness action schema, session-only registry, evidence cache, lifecycle state, or Git mutation adapter changes.
- No tag, GitHub Release, npm publication, network call, deployment, remote write, or source workspace mutation from the preflight.
- Current candidate remains blocked until the named copyright holder and release notes are explicitly resolved; this is expected and not a failed implementation.
