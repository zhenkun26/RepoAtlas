## 1. OpenSpec and compatibility boundary

- [x] 1.1 Strictly validate the proposal, design, new capability, and complete modified requirement deltas
- [x] 1.2 Preserve the exact public revision, explicit external workflow, session-only runtime state, and no install/publish/runtime-network authority

## 2. Official public API contract

- [x] 2.1 Add a bounded compile-time probe that imports official Harness declarations only from the exact explicit compatibility checkout
- [x] 2.2 Assert the RepoAtlas plugin apply/context, registered tool definitions, tool execution/session/signal, and host service adapter shapes against official exports
- [x] 2.3 Align sandbox-policy resolution to official `{ session, mode }` inputs and reject returned mode/root drift before sandbox or subprocess use
- [x] 2.4 Add focused tests for official policy request shape and fail-closed root/mode mismatch

## 3. Real boot smoke

- [x] 3.1 Reject missing, dirty, or revision-drifted Harness checkouts before compatibility execution
- [x] 3.2 Replace the help-only smoke with an owned ephemeral-loopback Web boot, bounded readiness parser, bounded HTTP probe, and controlled child termination
- [x] 3.3 Preserve fixed argv, `shell:false`, sanitized environment, temporary `DSH_HOME`, bounded diagnostics, and no RepoAtlas workspace writes
- [x] 3.4 Update the manual compatibility workflow to prepare official declarations and run the strengthened contract without adding it to default CI

## 4. Documentation and verification

- [x] 4.1 Update Harness integration, security boundary, roadmap, changelog, compatibility claims, and release checklist wording
- [x] 4.2 Run focused tests, full tests, lint, typecheck, strict OpenSpec validation, compatibility negative-path checks, and `git diff --check`
- [x] 4.3 Reconcile tasks only after evidence passes; do not archive, commit, push, install dependencies, publish, tag, release, or deploy
