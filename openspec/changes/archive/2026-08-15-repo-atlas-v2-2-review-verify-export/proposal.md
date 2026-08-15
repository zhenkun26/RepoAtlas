## Why

v2.1 can apply a caller-supplied patch to an isolated worktree, but the session currently has no explicit review/export handoff and no controlled post-apply verification gate. v2.2 completes the safe delivery loop without expanding the source-workspace, commit, merge, push, network, or code-generation boundary.

## What Changes

- Add explicit patch review and session-only export actions.
- Bind exported patch text and review metadata to the canonical patch digest.
- Add a controlled verification action that runs only configured, read-only recipes inside the session-owned isolated worktree.
- Record verification status, bounded output, audit identifiers, and failures without overstating patch success.
- Preserve non-force cleanup and all v2.1 prohibitions: no source workspace writes, commit, push, merge, deployment, dependency installation, network, or automatic rollback.
- Extend Harness integration so verification uses host-attested Goal state and one-time approval.

## Capabilities

### New Capabilities

- `patch-review-export`: Review canonical patch metadata and explicitly export the exact session-only patch text without writing an artifact to disk.
- `isolated-patch-verification`: Run one configured read-only verification recipe against an applied patch in its owned isolated worktree and report a bounded, auditable result.

### Modified Capabilities

None.

## Impact

- Affected contracts: proposal patch result types and `repo_atlas_change_proposal` actions.
- Affected modules: session-only proposal manager, controlled-action runtime, Harness plugin adapter, tests, roadmap, security and integration documentation.
- No new dependencies, persistent storage, network access, or workspace artifacts.
