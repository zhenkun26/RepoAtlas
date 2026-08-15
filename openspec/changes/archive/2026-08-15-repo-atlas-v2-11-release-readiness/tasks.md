## 1. OpenSpec and state-machine contract

- [x] 1.1 Validate the v2.11 proposal, release-readiness spec, design, and task dependencies before implementation
- [x] 1.2 Review the finite relation table, precedence rules, non-execution invariant, and failure/recovery semantics against the existing release action

## 2. Release readiness model and manager

- [x] 2.1 Add bounded release assessment types and the detached result field without changing existing lifecycle execution statuses
- [x] 2.2 Implement `ChangeProposalManager.inspectRelease` using only existing read-only worktree inspection and signal handling
- [x] 2.3 Add manager assertions for not-applicable, ready, proposal-state-blocked, dirty, identity-mismatch, unknown, abort, unknown proposal, detached results, and no-mutation history/counters

## 3. Harness integration

- [x] 3.1 Register and parse `inspect-release` with proposalId-only input
- [x] 3.2 Add Harness schema, blocked, success, failure, and compatibility assertions for the new action

## 4. Documentation and safety boundary

- [x] 4.1 Mark v2.10 complete and v2.11 current in the roadmap
- [x] 4.2 Document release readiness as advisory, session-only, local, bounded, and non-mutating in the security boundary and Harness integration guide

## 5. Verification and handoff

- [x] 5.1 Run focused L0/L1/L2 checks after implementation layers and check off only evidence-backed tasks
- [x] 5.2 Run npm test, lint, native and independent TypeScript checks, OpenSpec strict validation, and git diff checks
- [x] 5.3 Reconcile the active OpenSpec tasks with the final diff and report sync/archive/commit/push as separately authorized follow-ups
