## 1. Proposal Contract

- [x] 1.1 Add session-only change proposal, target operation, lifecycle status, digest, worktree, and bounded result types.
- [x] 1.2 Implement path/scope/sensitive-pattern validation and proposal budget accounting without triggering scanner reads.
- [x] 1.3 Implement deterministic proposal digesting and prepare/confirm/reject state transitions with replay and cross-session rejection.

## 2. Isolated Worktree Lifecycle

- [x] 2.1 Implement fixed local Git repository-root/HEAD discovery with shell-disabled subprocess calls and AbortSignal handling.
- [x] 2.2 Implement confirmed detached worktree creation outside the source workspace without copying uncommitted changes or using network operations.
- [x] 2.3 Implement explicit, ownership-checked, non-force worktree release and bounded failure results.

## 3. Harness Integration

- [x] 3.1 Register a proposal tool with prepare, confirm, reject, and release actions and keep its registry session-local.
- [x] 3.2 Bind proposal requests to a confirmed analysis session and expose evidence ids, limitations, risk, and non-executed status.
- [x] 3.3 Preserve existing analyze/refine/cache/AST behavior and ensure proposal flows do not read additional files automatically.

## 4. Verification and Documentation

- [x] 4.1 Add tests for valid lifecycle, path/scope/sensitive rejection, budgets, digest mismatch, dirty source, abort, Git failure, and release safety.
- [x] 4.2 Run typecheck, full tests, lint, OpenSpec strict validation, and diff checks; update the v2 roadmap entry and validation command if needed.
- [x] 4.3 Sync the completed v2 spec, archive the change only after all tasks pass, and prepare a focused commit without uploading unless separately requested.
