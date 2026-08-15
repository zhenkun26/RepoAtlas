## 1. OpenSpec and state-machine contract

- [x] 1.1 Validate v2.10 proposal, design, tasks, and landing-preflight spec before implementation
- [x] 1.2 Review relation decision table, invariants, failure/recovery, and bounded output fields

## 2. Read-only adapter and manager

- [x] 2.1 Add landing assessment types and detached result helpers
- [x] 2.2 Add fixed local Git source/target/ancestry inspection with shell:false
- [x] 2.3 Implement `ChangeProposalManager.inspectLanding` with fail-closed and no-event semantics
- [x] 2.4 Add manager tests for all relation rows, uncertainty, abort, clone isolation, and mutation counters

## 3. Harness integration

- [x] 3.1 Register `inspect-landing` and parse only proposalId
- [x] 3.2 Add Harness schema, blocked, success, and compatibility tests

## 4. Documentation and safety boundary

- [x] 4.1 Mark v2.9 complete and v2.10 current in the roadmap
- [x] 4.2 Document landing preflight as advisory, session-only, local, and non-mutating

## 5. Verification and handoff

- [x] 5.1 Run L0/L1/L2 checks after implementation layers and reconcile tasks against evidence
- [x] 5.2 Run npm test, lint, native typecheck, independent TypeScript check, OpenSpec strict validation, and diff checks
