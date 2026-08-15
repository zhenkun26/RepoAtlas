## Why

v2.10 can describe the relation between a session-created commit and the source workspace, but the existing `release` action still only reveals whether cleanup is safe when it is invoked. A separate read-only release-readiness observation is needed so callers can review the current session-owned worktree state before requesting cleanup, especially across patch, commit, landing, and uncertain lifecycle states.

## What Changes

- Add a session-only `inspect-release` action that accepts only a current-session `proposalId`.
- Return a bounded release assessment derived from proposal state and the existing read-only worktree inspection: not-applicable, ready, proposal-state-blocked, dirty, identity-mismatch, or unknown.
- Preserve detached results and fail-closed behavior for missing/unknown proposals, aborts, adapter failures, dirty worktrees, and identity mismatches.
- Keep release readiness advisory: the action does not remove worktrees, request approval, change lifecycle state, append history, or grant authorization.
- Update OpenSpec, roadmap, security boundary, Harness integration documentation, and manager/plugin regression tests.

## Capabilities

### New Capabilities

- `release-readiness`: bounded, session-only inspection of whether the existing release action's worktree preconditions are currently observable.

### Modified Capabilities

<!-- No existing requirement changes; this is a new read-only capability. -->

## Impact

- Affected code: `src/types.ts`, `src/repository/change-proposal.ts`, `src/harness/change-proposal-tool.ts`, and related tests.
- Affected documentation: `docs/roadmap.md`, `docs/security-boundary.md`, and `docs/harness-integration.md`.
- No new dependencies, persistence, network access, Git mutation, approval flow, or source workspace writes.
