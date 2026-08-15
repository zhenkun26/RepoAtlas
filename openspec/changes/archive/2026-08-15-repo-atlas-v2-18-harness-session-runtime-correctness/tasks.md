## 1. OpenSpec boundary

- [x] 1.1 Validate the v2.18 proposal, design, task list, and all capability deltas with strict OpenSpec checks
- [x] 1.2 Confirm the change preserves in-memory-only state, existing lifecycle state machines, explicit approval/digest gates, and no network or publish side effects

## 2. Invocation and session runtime

- [x] 2.1 Add a fail-closed Harness invocation resolver for execution, agent, exact session object, absolute session cwd, and caller signal
- [x] 2.2 Add per-Harness-session runtime ownership with one cwd-derived config and proposal manager per exact live session object
- [x] 2.3 Make analysis derive its workspace per invocation, forward the caller signal, and register completed analysis only in the owner session manager
- [x] 2.4 Make every proposal lifecycle action resolve the current session manager before parsing ids or accessing adapters
- [x] 2.5 Make controlled actions validate and execute relative to the calling session workspace rather than plugin mount cwd

## 3. Regression coverage

- [x] 3.1 Add two-workspace tests proving analysis follows each session cwd and never the Harness process cwd
- [x] 3.2 Add two-session tests proving equal or different cwd sessions cannot list, inspect, or mutate one another's proposal state
- [x] 3.3 Add missing execution/session/cwd and pre-aborted signal tests that prove I/O and adapters are not reached
- [x] 3.4 Update existing plugin and controlled-action fixtures to use realistic required Harness execution contexts

## 4. Documentation and verification

- [x] 4.1 Update Harness integration, security boundary, roadmap, and changelog wording for invocation cwd and exact Harness-session ownership
- [x] 4.2 Run focused plugin/controlled/proposal tests, full tests, typecheck, lint, strict OpenSpec validation, and `git diff --check`
- [x] 4.3 Reconcile this checklist only after the scoped acceptance evidence passes; do not archive, commit, push, or publish as part of implementation
