## 1. OpenSpec and contract

- [x] 1.1 Validate v2.6 proposal, design, tasks, and proposal-listing spec before implementation
- [x] 1.2 Add concrete summary/list result types and bounded limit contract

## 2. Session-only manager listing

- [x] 2.1 Implement bounded newest-first proposal summary listing from the existing registry
- [x] 2.2 Add tests for empty/default/explicit limits, invalid limits, truncation, deterministic order, and redacted summaries

## 3. Harness integration

- [x] 3.1 Register the `list` action and parse only the bounded limit input
- [x] 3.2 Add Harness schema and execution tests without approval or live Git access

## 4. Documentation and safety boundary

- [x] 4.1 Update roadmap with v2.6 and retain event history/rollback/merge outside this change
- [x] 4.2 Update security boundary and Harness integration docs with summary-only/no-refresh rules

## 5. Verification and handoff

- [x] 5.1 Run L0/L1/L2 checks after implementation layers and reconcile tasks against evidence
- [x] 5.2 Run npm test, lint, native typecheck, independent TypeScript check, OpenSpec strict validation, and diff checks
