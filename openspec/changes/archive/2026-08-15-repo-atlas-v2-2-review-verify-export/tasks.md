## 1. OpenSpec and contracts

- [x] 1.1 Validate the v2.2 proposal, design, and delta specs before implementation
- [x] 1.2 Add session-only patch export, review, and verification result types without changing commit/push semantics

## 2. Patch review and export

- [x] 2.1 Implement manager review and exact-digest export actions without workspace persistence
- [x] 2.2 Add export disclosure, mismatch, terminal-state, and non-mutation tests

## 3. Isolated verification

- [x] 3.1 Extend controlled-action execution with host-controlled verification roots while preserving source workspace checks
- [x] 3.2 Implement manager verification state transitions, worktree postconditions, bounded result retention, and terminal replay behavior
- [x] 3.3 Add Harness verification runner with Goal, one-time approval, read-only recipe, sandbox, subprocess, timeout, and redaction gates
- [x] 3.4 Add fake-runner, failure, abort, policy mismatch, unexpected-change, and real temporary worktree verification tests

## 4. Harness and documentation

- [x] 4.1 Register review, export, and verify actions in the proposal tool and update plugin compatibility tests
- [x] 4.2 Update roadmap, security boundary, and Harness integration documentation for v2.2

## 5. Verification and handoff

- [x] 5.1 Run focused tests after each implementation layer and reconcile task checkboxes
- [x] 5.2 Run npm test, lint, native typecheck, alternative TypeScript check, OpenSpec strict validation, and git diff checks
- [x] 5.3 Leave the active OpenSpec change uncommitted and report sync/archive/commit/push as later authorized follow-ups
