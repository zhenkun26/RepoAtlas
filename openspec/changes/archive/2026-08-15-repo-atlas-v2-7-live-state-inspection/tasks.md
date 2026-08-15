## 1. OpenSpec and contract

- [x] 1.1 Validate v2.7 proposal, design, tasks, and live-state-inspection spec before implementation
- [x] 1.2 Add concrete live observation/result types and explicit available/partial/unknown semantics

## 2. Read-only manager inspection

- [x] 2.1 Implement source/worktree live inspection by reusing the existing fixed Git adapter
- [x] 2.2 Add tests for source-only, worktree, dirty/mismatch, partial, unknown, abort, redaction, and no lifecycle mutation

## 3. Harness integration

- [x] 3.1 Register `inspect-live` and derive all adapter inputs from the session-owned proposal
- [x] 3.2 Add Harness schema and execution tests for success, missing/unknown proposal, and live observation statuses

## 4. Documentation and safety boundary

- [x] 4.1 Mark v2.6 complete and v2.7 current in roadmap; retain event history/rollback/merge outside this change
- [x] 4.2 Update security boundary and Harness integration docs with read-only live observation rules

## 5. Verification and handoff

- [x] 5.1 Run L0/L1/L2 checks after implementation layers and reconcile tasks against evidence
- [x] 5.2 Run npm test, lint, native typecheck, independent TypeScript check, OpenSpec strict validation, and diff checks
