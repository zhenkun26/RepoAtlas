## 1. OpenSpec and state-machine contract

- [x] 1.1 Validate v2.8 proposal, design, tasks, and lifecycle-event-history spec before implementation
- [x] 1.2 Review legal/no-transition event table and define concrete bounded event/request/result types

## 2. Session-only manager history

- [x] 2.1 Add positive retention limit and per-proposal in-memory event recorder with bounded/redacted snapshots
- [x] 2.2 Instrument every actual proposal/worktree/patch/verification/commit/landing/release state mutation without recording read-only calls
- [x] 2.3 Implement bounded chronological `history` query with fail-closed unknown proposal and invalid limit handling
- [x] 2.4 Add manager tests for legal/illegal transitions, uncertain and interrupted states, retention/truncation, redaction, no adapter calls, and clone isolation

## 3. Harness integration

- [x] 3.1 Register `history` action and bounded limit parsing while preserving existing actions
- [x] 3.2 Add Harness schema and execution tests for success, empty, invalid, missing and unknown inputs

## 4. Documentation and safety boundary

- [x] 4.1 Mark v2.7 complete and v2.8 current in roadmap; describe event-history memory/retention boundaries
- [x] 4.2 Update security boundary and Harness integration documentation with session-only event rules

## 5. Verification and handoff

- [x] 5.1 Run L0/L1/L2 checks after implementation layers and reconcile tasks against evidence
- [x] 5.2 Run npm test, lint, native typecheck, independent TypeScript check, OpenSpec strict validation, and diff checks
