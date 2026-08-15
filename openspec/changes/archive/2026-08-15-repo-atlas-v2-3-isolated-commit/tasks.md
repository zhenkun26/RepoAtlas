## 1. OpenSpec and contract

- [x] 1.1 Validate the v2.3 proposal, design, and delta specs before implementation
- [x] 1.2 Add session-only commit draft, approval, execution, and ambiguity types while preserving patch-not-applied/commit-not-created semantics

## 2. Commit draft lifecycle

- [x] 2.1 Stabilize worktree ownership identity independently from the recorded base revision
- [x] 2.2 Implement bounded commit-message validation, commit digest binding, prepare/reject/confirm state transitions, and terminal replay behavior
- [x] 2.3 Add state-machine tests for valid, unverified, digest mismatch, rejection, expiry, abort, and replay paths

## 3. Fixed isolated Git commit

- [x] 3.1 Add a Git adapter commit operation that stages only declared paths and checks the staged path set
- [x] 3.2 Execute fixed local commit arguments with shell:false, no hooks, no GPG signing, no author override, and no remote access
- [x] 3.3 Add commit success, failure, interruption, postcondition-unknown, source-isolation, and clean-release tests using a temporary Git repository

## 4. Harness integration and documentation

- [x] 4.1 Add host Goal and one-time approval authorizer for commit confirmation
- [x] 4.2 Register prepare-commit, confirm-commit, and reject-commit actions in the proposal tool
- [x] 4.3 Update roadmap, security boundary, Harness integration, and v2.1/v2.2 compatibility wording

## 5. Verification and handoff

- [x] 5.1 Run focused L0/L1/L2 checks after each implementation layer and reconcile task checkboxes
- [x] 5.2 Run npm test, lint, native typecheck, alternative TypeScript check, OpenSpec strict validation, and git diff checks
- [x] 5.3 Leave the change active and uncommitted; report sync/archive/commit/push as explicit follow-up actions
