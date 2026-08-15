## 1. OpenSpec boundary and release decision

- [x] 1.1 Validate the v2.14 proposal, design, tasks, and public-release-preflight spec before implementation
- [x] 1.2 Confirm source-first `private: true` distribution, candidate version `0.1.0`, MIT attribution, and no-npm boundary
- [x] 1.3 Review release invariants, blocker codes, failure modes, rollback, and acceptance evidence before editing

## 2. Release governance

- [x] 2.1 Add proposed first-release support policy with Node/Harness compatibility, security handling, attribution, and no-SLA boundaries
- [x] 2.2 Add source-first release procedure with human gates and explicit tag/release/publish non-automation
- [x] 2.3 Record successful v2.13 Harness smoke and README recheck in the release checklist

## 3. Read-only candidate preflight

- [x] 3.1 Implement bounded fixed-local-Git/file `verify-release-preflight` with `ready`/`blocked` JSON and fail-closed blockers
- [x] 3.2 Add package script and manual `workflow_dispatch` quality/preflight workflow without release side effects
- [x] 3.3 Verify current candidate reports unresolved human release blockers and never reports release/tag/publish success

## 4. Repository guidance

- [x] 4.1 Update README, CONTRIBUTING, SECURITY, CHANGELOG, roadmap, and release checklist with v2.14 boundaries
- [x] 4.2 Keep the current source/plugin bundle support contract and MIT/source attribution wording consistent

## 5. Verification and handoff

- [x] 5.1 Run focused preflight and controlled blocker checks
- [x] 5.2 Run tests, lint, native/independent typechecks, source artifact smoke, strict OpenSpec validation, and diff checks
- [x] 5.3 Reconcile tasks and leave actual tag/release/publish actions pending explicit authorization
