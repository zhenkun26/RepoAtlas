## Context

See `proposal.md` for the motivation. The current manager already retains canonical patch bytes only in a session-local map, exposes a bounded summary, applies to a session-owned detached worktree, and refuses dirty release. Controlled actions already provide configured recipe lookup, host Goal checks, one-time Harness approval, sandbox confinement, bounded output, redaction, timeout, and fail-closed behavior.

## Goals / Non-Goals

**Goals:**

- Make review and handoff explicit while keeping patch text session-only.
- Execute verification only after patch application, exact digest confirmation, worktree identity checks, and host approval.
- Reuse the existing controlled-action runtime rather than creating a second command runner.
- Preserve a separate patch-application state from verification state.

**Non-Goals:**

- No patch generation, source-workspace mutation, commit, merge, cherry-pick, push, deployment, dependency installation, network access, or automatic rollback.
- No persisted export file. Export is returned as a bounded tool result for the caller to save or inspect explicitly.

## Decisions

1. **Use explicit `review-patch`, `export-patch`, and `verify-patch` actions.** Review returns the existing bounded descriptor; export returns canonical patch bytes only when the caller supplies the exact patch digest; verify requires an applied patch, the same exact digest, and a configured recipe id. This keeps each side effect and disclosure visible.

2. **Keep export and verification session-only.** The manager continues to hold patch bytes and verification records in memory. No workspace file, cache, database, or remote service is used. This avoids silently turning a review action into persistence.

3. **Inject a verification runner into the manager and implement it in the Harness adapter.** The manager owns state transitions and worktree postconditions; the adapter owns Goal/approval/sandbox/subprocess capabilities. The runner reuses controlled-action semantics and receives the worktree path from the host-controlled proposal record, never from model input.

4. **Require read-only recipes for patch verification.** A recipe configured for `workspace-write` is rejected before approval or process start. Verification output is bounded and redacted by the existing runtime. The worktree is inspected before and after execution to reject identity changes or unexpected paths.

5. **Keep verification status orthogonal to patch status.** A failed, blocked, or interrupted verification never changes `patch-applied` to `patch-not-applied`; it records that the applied patch lacks a successful verification result.

## Risks / Trade-offs

- [Risk] Export exposes the complete caller-supplied patch to the caller. → Require the exact digest, apply byte limits already enforced by v2.1, and never persist the text.
- [Risk] A recipe can fail after starting or attempt to write. → Reuse approval, sandbox, subprocess, timeout, redaction, and read-only enforcement; inspect the worktree after execution and keep the worktree for review on uncertainty.
- [Risk] Session interruption loses the in-memory registry while a worktree may remain. → Preserve v2.1 manual recovery semantics; do not add cross-session cleanup or force removal.
- [Risk] The host sandbox may not support an external isolated worktree root. → The verification runner fails closed when the resolved policy root does not exactly match the owned worktree.

## Migration Plan

1. Add the new types and manager transitions behind the existing session-only manager.
2. Add the Harness runner and new tool actions, then cover fake and real temporary Git worktrees.
3. Run tests, lint, alternative TypeScript check, and strict OpenSpec validation.
4. If verification is disabled or unavailable, existing v2.1 patch apply remains usable and reports verification as not run; no migration or rollback data is required.

## Open Questions

None. Commit/merge/source landing remains a later OpenSpec change.
