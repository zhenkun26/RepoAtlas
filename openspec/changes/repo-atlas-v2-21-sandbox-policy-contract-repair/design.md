## Context

The exact pinned Harness service accepts three sandbox modes, while RepoAtlas recipes permit only the two confined modes. Structural assignability requires the facade to describe the official service input, but execution authority is enforced later by the existing adapter checks.

## Goals / Non-Goals

**Goals:**

- Restore exact-pin structural compatibility at the public facade.
- Prove that an unconfined resolved mode remains rejected before any process effect.

**Non-Goals:**

- Enabling `danger-full-access` recipes or escalation.
- Changing approval, workspace-root, sandbox, subprocess, or session-isolation behavior.

## Decisions

- Define one local three-value sandbox mode alias and use it only at the Harness facade boundary. This mirrors the official closed vocabulary without importing Harness packages into RepoAtlas runtime code.
- Keep the existing narrowed controlled-action policy types and runtime guards. Widening those downstream types would confuse API compatibility with granted authority.
- Add a focused adapter regression test that returns `danger-full-access` and asserts zero sandbox and subprocess calls. The exact-pin compile probe remains the external contract evidence.

## Risks / Trade-offs

- [Risk] A future official mode extends the union again. → The exact-pin type assertion remains fail-closed and requires a reviewed update.
- [Risk] A broad facade type is mistaken for runtime permission. → Keep the confined adapter checks explicit and covered by a no-effect regression test.

## Migration Plan

Apply the facade and test changes together. Rollback is limited to the local type alias/interface and its regression test; no data or persistent state is involved.
