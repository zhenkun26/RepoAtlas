## Context

v2.3 ends with a clean commit in a detached worktree and deliberately leaves the source workspace untouched. The next delivery must make source mutation possible only as a separate, reviewable step. A general merge workflow would introduce conflict resolution, merge commits, branch policy, and rollback questions, so this change is limited to a fast-forward from the exact recorded base revision.

## Goals / Non-Goals

**Goals:**

- Land exactly one created commit from the current session into the original source workspace.
- Make source path, source base revision, target commit revision, approval, digest, and postcondition auditable in session memory.
- Preserve source workspace safety by requiring clean state and exact base revision before every mutation.
- Preserve fail-closed behavior when Git output, interruption, or postcondition cannot prove the outcome.

**Non-Goals:**

- No conflict resolution, merge commit, branch creation, cherry-pick, reset, revert, remote/network access, push, deployment, dependency installation, or automatic cleanup.

## Invariants

1. Only a proposal with `status=confirmed`, `commit.status=created`, `commit.executionStatus=commit-created`, and a recorded commit revision can prepare a landing.
2. The source workspace must be clean, resolve to the proposal repository root, and have `HEAD === proposal.baseRevision` during prepare and immediately before confirm.
3. A landing confirmation digest binds proposal id, commit id/revision, source path, source base revision, and landing target; a mismatch never reaches approval or Git.
4. The adapter accepts no user command, option, remote, branch, message, or conflict strategy. It runs only fixed local Git arguments with `shell:false`.
5. Successful landing is proven only when source `HEAD === commitRevision`, source is clean, and repository/path identity remains unchanged.
6. Any uncertain result preserves the source workspace and isolated worktree as-is; the manager never resets, reverts, cleans, or force-removes automatically.

## Failure / Recovery

- Invalid proposal, missing commit, dirty source, source revision drift, repository mismatch, digest mismatch, missing approval, or expired draft: no source mutation; return blocked or existing pending result.
- Git precondition failure before merge: return `landing-not-performed`; source remains available for explicit external review.
- Abort, timeout, process failure after merge may have started, or postcondition inspection failure: return `landing-unknown` with `landing-creation-unknown`; retain source and worktree with no automatic repair.
- Successful landing: source advances by fast-forward only; existing safe release may later release the clean isolated worktree.

## Call Chain / Side-Effect Boundary

`repo_atlas_change_proposal(confirm-landing)` → `ChangeProposalManager.confirmLanding` → session-only landing authorizer → `GitWorktreeAdapter.land` → fixed local Git merge in `proposal.workspaceRoot`; no remote or subprocess recipe is accepted from tool input.

## Verification Evidence

- State-machine tests cover valid, unverified, dirty source, base drift, digest mismatch, approval rejection, expiry, abort, replay, Git failure, and unknown postcondition paths.
- A temporary Git repository proves source isolation before landing, fast-forward source update after landing, no remote access, and clean release after success.
- Full project tests, lint, native typecheck, alternative TypeScript check, OpenSpec strict validation, and diff checks must pass.
