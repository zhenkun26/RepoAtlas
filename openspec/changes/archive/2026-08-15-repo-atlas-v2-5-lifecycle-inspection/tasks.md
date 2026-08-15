## 1. OpenSpec and contract

- [x] 1.1 Validate v2.5 proposal, design, tasks, and lifecycle-inspection spec before implementation
- [x] 1.2 Add the inspect action contract and document session-only/no-refresh semantics

## 2. Session-only manager inspection

- [x] 2.1 Add `ChangeProposalManager.inspect(proposalId)` using the existing cloned result path
- [x] 2.2 Add tests for pending, terminal/uncertain state preservation, clone isolation, and unknown proposal fail-closed behavior

## 3. Harness integration

- [x] 3.1 Register the `inspect` action and require a proposal id without requesting approval
- [x] 3.2 Add Harness schema and execution tests for inspect success and missing/unknown ids

## 4. Documentation and safety boundary

- [x] 4.1 Update roadmap with v2.5 completion and retain v2.6 candidates outside this change
- [x] 4.2 Update security boundary and Harness integration docs with no-refresh/no-side-effect rules

## 5. Verification and handoff

- [x] 5.1 Run L0/L1/L2 checks after implementation layers and reconcile tasks against evidence
- [x] 5.2 Run npm test, lint, native typecheck, independent TypeScript check, OpenSpec strict validation, and diff checks
