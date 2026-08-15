## 1. OpenSpec and contract

- [x] 1.1 Validate v2.4 proposal, design, and source-workspace-landing spec before implementation
- [x] 1.2 Add session-only landing draft, status, execution, digest, and approval types while preserving commit/push non-execution states

## 2. Source landing state machine

- [x] 2.1 Add source worktree inspection and exact-base/clean preconditions
- [x] 2.2 Implement prepare/confirm/reject landing transitions, digest binding, expiry, abort, replay, and ambiguity semantics
- [x] 2.3 Add state-machine tests for valid, missing commit, dirty source, base drift, digest mismatch, rejection, expiry, abort, and replay

## 3. Fixed local Git landing

- [x] 3.1 Add adapter land operation with fixed `merge --ff-only --no-verify --no-edit` arguments and shell:false
- [x] 3.2 Add real temporary Git tests for source isolation, fast-forward landing, non-fast-forward rejection, failure, unknown postcondition, and clean release

## 4. Harness and documentation

- [x] 4.1 Add host Goal and one-time approval authorizer for source landing
- [x] 4.2 Register prepare-landing, confirm-landing, and reject-landing actions
- [x] 4.3 Mark v2.3 complete and v2.4 current in roadmap; update security and Harness integration boundaries

## 5. Verification and handoff

- [x] 5.1 Run focused L0/L1/L2 checks after each implementation layer
- [x] 5.2 Run npm test, lint, native typecheck, alternative TypeScript check, OpenSpec strict validation, and git diff checks
- [x] 5.3 Leave v2.4 active and uncommitted; report archive, commit, and push as explicit follow-up actions
