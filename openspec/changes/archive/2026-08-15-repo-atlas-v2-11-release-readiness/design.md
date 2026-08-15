## Context

See `proposal.md` for the motivation. The existing proposal manager already owns the session-only registry and has a fixed read-only `GitWorktreeAdapter.inspect` method. The existing `release` operation accepts only a confirmed proposal with a managed worktree, then checks identity and cleanliness immediately before calling the mutating `remove` adapter method. The generic `inspect-live` action also reads worktree state, but it intentionally reports source/worktree observations rather than release-specific eligibility and performs an additional source inspection.

## Goals / Non-Goals

**Goals:**

- Add a release-specific, detached observation that callers can inspect before invoking the existing release action.
- Reuse existing registry, adapter, redaction, signal, clone, and result conventions.
- Make all readiness outcomes finite and fail closed, with no lifecycle transition or authorization implication.
- Keep the change session-only and local, with no new dependency or persistence surface.

**Non-Goals:**

- Do not change the existing release mutation or its cleanup policy.
- Do not inspect source landing state, create a new Git command, remove a worktree, or repair dirty/uncertain state.
- Do not add a release approval flow, recovery action, cross-session index, or path/revision/command input.

## Decisions

### Add a dedicated `inspect-release` action

The action is separate from `inspect-live` because its contract answers a narrower question: whether the current proposal state and managed worktree facts satisfy the existing release preconditions. Reusing `inspect-live` would expose unrelated source observations and would make callers infer release semantics from a generic status. The action accepts only `proposalId`; every worktree reference comes from the registry.

### Reuse `adapter.inspect` and do not extend the adapter interface

`adapter.inspect` already verifies the managed worktree record, derives its identity, and reports dirty state. A new adapter method would duplicate Git behavior and create another mutation boundary. The manager compares the inspected identity with the recorded session-owned identity and treats a clean matching result as `ready`.

### Use a finite relation with explicit precedence

The assessment uses `not-applicable`, `ready`, `proposal-state-blocked`, `worktree-dirty`, `identity-mismatch`, and `unknown`. The decision order is:

1. Unknown proposal is blocked before any assessment or adapter access.
2. Missing worktree is `not-applicable`.
3. A retained worktree on a non-`confirmed` proposal is `proposal-state-blocked`; no adapter call is needed because the existing release action rejects that proposal state.
4. An already-aborted signal is `unknown` without adapter access.
5. Adapter failure is `unknown`.
6. Identity mismatch is `identity-mismatch`.
7. Dirty state is `worktree-dirty`.
8. Otherwise the assessment is `ready`.

This keeps `ready` narrower than “the remove call will definitely succeed”: it proves only the same observable preconditions at inspection time, while the existing release action must re-check them at execution time.

### Keep the assessment narrow and detached

The new result field contains status, relation, bounded reason, timestamp, `sessionOnly=true`, and safe boolean facts (`clean`, `identityMatches`) when available. It does not add absolute paths, changed path names, patch text, digests, commands, approval data, or a permission token. Existing `ChangeProposalResult` cloning remains the source of proposal snapshot detachment.

## Risks / Trade-offs

- [Stale observation] The worktree can change after inspection → the existing `release` action remains authoritative and must re-check identity/cleanliness before removal.
- [State confusion] `ready` could be mistaken for authorization → every result reason and documentation state that release was not performed and no approval was granted.
- [Uncertain adapter state] An inspection failure could hide a clean worktree → return `unknown` and preserve the proposal without cleanup.
- [Duplicate inspection surface] `inspect-live` overlaps at the adapter level → keep this action limited to release semantics and avoid changing `inspect-live` behavior.

## Migration Plan

No data or dependency migration is required. Add the active OpenSpec change, implement the in-memory type/manager/Harness changes, and update tests and documentation. Rollback is code-only: remove the v2.11 files and changes; existing proposal lifecycle and release behavior remain available. OpenSpec sync/archive and commit/push are follow-up operations requiring explicit authorization.
