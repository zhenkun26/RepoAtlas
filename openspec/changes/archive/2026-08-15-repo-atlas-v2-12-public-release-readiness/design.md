## Context

The repository is a TypeScript Harness plugin with source entry points and no compiled distribution. The current working tree also contains the separate, active v2.11 `inspect-release` change. v2.12 must remain a documentation and delivery-boundary change so that v2.11 implementation, sync, archive, and release decisions remain independently reviewable.

## Goals / Non-Goals

**Goals:**

- Make a clean public checkout understandable and legally usable by contributors.
- Make the required quality checks executable on every pull request and push to `main`.
- State the source-first distribution posture and prevent accidental npm publication claims.
- Record the next release-engineering steps as roadmap items with explicit boundaries.

**Non-Goals:**

- Do not change any RepoAtlas runtime action or lifecycle state machine.
- Do not remove `private: true`, publish to npm, create a compiled `dist/`, or choose a final package distribution contract beyond documenting the decision gate.
- Do not clone or run the external Harness checkout in CI in this change.
- Do not create tags, GitHub Releases, commits, pushes, deployments, or remote issue/security configuration.

## Decisions

### Source-first public release

The repository is documented as a source checkout loaded through the Harness bundle manifest. `private: true` remains in `package.json` until v2.13 resolves whether a public npm package is wanted and defines build, `files`, packed-install, and compatibility contracts.

### MIT working assumption

Add the MIT text at the repository root and declare `license: "MIT"` in package metadata. This is a reversible repository change, but the named copyright holder must confirm it before the first public release.

### CI owns quality gates, not release side effects

The workflow runs tests and static/spec checks on pull requests and pushes to `main`. It does not publish, tag, push generated output, or invoke RepoAtlas runtime actions against user repositories. OpenSpec is invoked at a pinned CLI version in the disposable CI runner because it is a repository process tool, not a runtime dependency.

### Follow-up boundaries

- v2.13: clean-clone/packed-install evaluation and real Harness smoke validation, with the package distribution decision.
- v2.14: first public release process, including confirmed license holder, support policy, tag/release notes, and optional npm publication if v2.13 accepts it.

## Risks / Trade-offs

- A source-first package is not an npm-installable compiled artifact; README and checklist must say this plainly.
- CI depends on a pinned external OpenSpec CLI download; failure to fetch it must fail the CI job rather than silently skipping spec validation.
- MIT is a provisional assumption until ownership is confirmed; the checklist must keep this as a release blocker.
- A real Harness integration is not proven by fake-context plugin tests; it is explicitly deferred and must not be advertised as complete.

## Rollback

Rollback is file-level: remove the v2.12 governance, documentation, metadata, and workflow additions while leaving v2.11 runtime files untouched. Do not use reset, checkout, or clean because the v2.11 worktree changes are user-owned and remain active.
