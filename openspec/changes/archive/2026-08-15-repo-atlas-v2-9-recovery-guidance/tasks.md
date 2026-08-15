## 1. OpenSpec and state-machine contract

- [x] 1.1 Validate v2.9 proposal, design, tasks, and recovery-guidance spec before implementation
- [x] 1.2 Review decision table and define concrete recommendation/allowed-action/result types

## 2. Read-only manager guidance

- [x] 2.1 Add detached recovery guidance types and conservative decision-table mapper
- [x] 2.2 Implement `inspectRecovery` from session registry only, with fail-closed unknown proposal handling
- [x] 2.3 Add manager tests for every legal recommendation, terminal/uncertain fail-safe state, no adapter/event mutation, and clone isolation

## 3. Harness integration

- [x] 3.1 Register `inspect-recovery` action and proposalId parsing while preserving existing actions
- [x] 3.2 Add Harness schema and execution tests for success, missing and unknown proposal

## 4. Documentation and safety boundary

- [x] 4.1 Mark v2.8 complete and v2.9 current in roadmap; document that guidance is not authorization or execution
- [x] 4.2 Update security boundary and Harness integration documentation with manual-review and no-side-effect rules

## 5. Verification and handoff

- [x] 5.1 Run L0/L1/L2 checks after implementation layers and reconcile tasks against evidence
- [x] 5.2 Run npm test, lint, native typecheck, independent TypeScript check, OpenSpec strict validation, and diff checks
