## Why

v2.2 can apply, review, export, and verify a patch in an isolated worktree, but it cannot produce a local commit that a human can inspect or hand off. v2.3 adds that smallest next delivery step while keeping source-workspace mutation, merge, push, network, and code generation out of scope.

## What Changes

- Add a session-only commit draft lifecycle: prepare, review through the proposal result, confirm, reject, and release after a clean committed worktree.
- Require an exact commit confirmation digest bound to the applied patch, passed verification result, worktree identity/base revision, declared paths, and explicit bounded commit message.
- Require host-attested Goal state and one-time Harness approval before the local commit side effect.
- Stage only the patch-declared paths and create one local commit with fixed Git arguments; skip hooks and GPG signing, and never access remotes.
- Record created, failed, interrupted, and commit-creation-unknown states without automatic reset, rollback, force cleanup, merge, or push.
- Keep patch application semantics explicit: patch application itself remains non-committing, while the separate commit action may create a commit only in the owned detached worktree.

## Capabilities

### New Capabilities

- `isolated-worktree-commit`: Explicitly confirm and create a bounded local commit from a passed, applied patch in the session-owned detached worktree.

### Modified Capabilities

- `bounded-patch-application`: Clarify that patch application remains non-committing while a separate v2.3 commit action may create a local isolated-worktree commit.

## Impact

- Affected contracts: proposal commit types, execution states, confirmation actions, and Git worktree adapter behavior.
- Affected modules: session-only proposal manager, Harness proposal tool and approval adapter, tests, roadmap, security boundary, and integrated OpenSpec specs.
- No new dependencies, persistent RepoAtlas storage, source-workspace writes, remote Git access, or deployment behavior.
