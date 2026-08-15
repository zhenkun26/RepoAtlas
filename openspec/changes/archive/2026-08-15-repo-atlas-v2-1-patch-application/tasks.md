## 1. Patch Contract and State Model

- [x] 1.1 Extend `src/types.ts` with bounded patch input, patch summary, patch state, patch digest, and execution-status types while preserving session-only proposal ownership.
- [x] 1.2 Add configurable positive-safe-integer patch budgets and a transition table covering `not-prepared`, `awaiting-confirmation`, `applied`, `rejected`, `blocked`, and `interrupted` states.
- [x] 1.3 Define canonical patch digest input and bounded result cloning without returning unbounded patch/source content.

## 2. Unified-Diff Validation

- [x] 2.1 Implement a dependency-free regular-file unified-diff parser for add, modify, and delete operations with bounded bytes, files, hunks, line lengths, and summary text.
- [x] 2.2 Reuse existing workspace path, sensitive path, excluded directory, and GoalSpec scope policies; require exact operation/path coverage by confirmed proposal targets.
- [x] 2.3 Reject binary, rename/copy, mode, submodule, traversal, absolute, unsupported-header, and secret-like patch inputs before any Git apply or workspace write.

## 3. Patch Draft and Apply Lifecycle

- [x] 3.1 Add `prepare-patch` validation and session-only draft registration for confirmed, clean, identity-matching proposal worktrees.
- [x] 3.2 Add exact-digest `confirm-patch` handling with expiry, replay, AbortSignal, live revision/identity, and clean-worktree checks.
- [x] 3.3 Extend the Git adapter with fixed local `git apply` preflight/apply and postcondition inspection using `shell:false` and no reject/3-way/index/remote options.
- [x] 3.4 Preserve source-workspace isolation and record `patch-applied`, `patch-not-applied`, or `patch-application-unknown` without commit, push, deployment, or dependency installation.
- [x] 3.5 Preserve non-force release behavior for applied dirty worktrees and return retained paths on cleanup failure.

## 4. Harness Integration

- [x] 4.1 Extend `src/harness/change-proposal-tool.ts` with `prepare-patch`, `confirm-patch`, and patch rejection actions while retaining v2 action compatibility.
- [x] 4.2 Preserve the plugin's session-local manager ownership and existing analyze tool behavior in `src/harness/plugin.ts`. <!-- reused: existing plugin manager registration -->

## 5. Verification and Documentation

- [x] 5.1 Add state-machine tests for every legal transition and each rejected transition, including digest mismatch, replay, expiry, abort, dirty, unowned, and identity mismatch cases.
- [x] 5.2 Add parser/validation tests for valid add/modify/delete diffs, scope/path/sensitive rejection, unsupported forms, secret-like content, and every budget.
- [x] 5.3 Add temporary-Git integration tests proving source changes remain untouched, only the owned worktree changes, postconditions are checked, and applied dirty worktrees are never force-released.
- [x] 5.4 Verify existing v2 proposal/plugin compatibility and run tests, lint, alternative typecheck, OpenSpec strict validation, and diff checks; keep native npm typecheck labeled BLOCKED if the known environment issue remains.
- [x] 5.5 Update `docs/roadmap.md` only after implementation and validation pass; sync the main spec and archive this change only with explicit follow-up authorization.
