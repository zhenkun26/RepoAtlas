## Why

v2.3 can create and verify a local commit in a session-owned detached worktree, but the reviewed result remains isolated from the source workspace. v2.4 adds the smallest source landing step: an explicit, fast-forward-only local landing of that exact session-owned commit.

## What Changes

- Add a session-only landing draft lifecycle: `prepare-landing`, `confirm-landing`, and `reject-landing`.
- Permit landing only for a `created` v2.3 commit whose source workspace is clean and still at the recorded proposal base revision.
- Require a landing digest bound to the proposal, commit, source path/revision, and target commit revision, plus active+armed Harness Goal and one-time approval.
- Execute only fixed local `git merge --ff-only --no-verify --no-edit <commit>` behavior; do not resolve conflicts, create merge commits, create branches, access remotes, or push.
- Report completed, blocked, interrupted, and unknown landing results without automatic reset, rollback, clean, or force cleanup.
- Update roadmap, security boundary, Harness integration, and acceptance fixtures for source landing.

## Non-goals

- No patch generation, source conflict resolution, merge commit, branch creation, cherry-pick, reset, revert, remote access, push, deployment, dependency installation, or network service.
- No cross-session landing registry or persistent state.
- No automatic recovery after a landing result is uncertain.

## Capabilities

### New Capabilities

- `source-workspace-landing`: Explicitly land a session-owned verified detached-worktree commit into the original source workspace using a clean, exact-base, fast-forward-only local Git operation.

## Impact

- Affected contracts: proposal landing types, execution status, digest and state transitions, source-worktree inspection, and Harness proposal actions.
- Affected modules: session-only proposal manager, fixed Git adapter, Harness approval/tool wiring, tests, roadmap, and security documentation.
- No new dependencies or persistent storage.
