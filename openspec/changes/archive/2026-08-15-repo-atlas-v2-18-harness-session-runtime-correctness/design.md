## Context

See `proposal.md` for motivation. The current adapter constructs one `RepoAtlasConfig` and one `ChangeProposalManager` during plugin mount. Harness tool execution already carries a required caller signal and an optional agent whose live session has an immutable header cwd. Existing core APIs accept an explicit workspace and signal, so the defect is concentrated in the Harness adapter and its state ownership seam.

## Goals / Non-Goals

**Goals:**

- Resolve one canonical workspace per invocation from the live Harness session.
- Make session ownership unforgeable by ids or cwd equality.
- Keep every existing lifecycle state machine and safety postcondition intact.
- Preserve direct core API usage outside Harness.

**Non-Goals:**

- Do not persist registries or recover them across process restarts.
- Do not redesign proposal digests, Git operations, approval semantics, or lifecycle transitions.
- Do not solve the official sandbox API mismatch for isolated worktree verification; v2.19 owns that external contract.
- Do not add npm distribution or compiled artifacts.

## Decisions

### Use the live session object as the ownership key

The plugin will hold a `WeakMap<HarnessSession, HarnessSessionRuntime>`. Each value contains one canonical cwd-derived config and one proposal manager. Object identity is stronger than session id or cwd strings: equal paths do not merge sessions, model input cannot forge the key, and retired sessions can be garbage-collected.

Alternative considered: a `Map<string, Manager>` keyed by session header id. It would require explicit cleanup and would make a durable-looking string an ownership credential, so it is rejected.

### Resolve runtime context before parsing stateful requests

A shared helper will require execution, agent, session, absolute non-empty cwd, and signal, then canonicalize cwd through the existing config/path boundary. Analysis, proposal, and controlled-action adapters use that helper before manager lookup or I/O. Clarification-only analysis may parse the goal first, but it still must not create or access session state without runtime context.

Alternative considered: fallback to configured workspace or `process.cwd()`. That preserves fake-context convenience but recreates the production defect, so only direct core APIs and explicit unit factories retain standalone roots.

### Keep managers single-root and create one per Harness session

`ChangeProposalManager` already validates sessions and patches against one config root. Rather than make one manager multi-root, the adapter constructs a manager for each session runtime. This reuses all existing path, budget, state-machine, and Git safety code while making cross-session lookup structurally impossible.

### Forward the caller signal without adding an analysis timeout

The adapter passes `execution.signal` to `analyzeRepository` and existing manager methods. v2.18 does not declare `timeoutMs`; the Harness caller or policy may impose a deadline and the same signal remains the cancellation authority.

## Risks / Trade-offs

- [Tests currently call tool bodies without execution] → update Harness adapter tests with realistic session objects and keep direct repository tests on core APIs.
- [A session object could be recreated during resume] → resumed calls receive a fresh manager by design; the contract is session-only memory, not persistence or recovery.
- [Clarification calls become stricter] → return a bounded blocked result when runtime facts are absent; production Harness always supplies execution context.
- [Controlled action behavior still depends on official sandbox shape] → v2.18 only fixes root derivation; v2.19 contract tests must resolve the external API mismatch before compatibility can pass.

## Migration Plan

1. Add invocation/session runtime helpers and regression tests.
2. Move analysis and proposal tool registration onto the per-session runtime resolver.
3. Move controlled-action root derivation onto the same resolver.
4. Run typecheck, focused tests, full tests, lint, and strict OpenSpec validation.

Rollback is code-only: revert the adapter/runtime helper and tests. No persistent state or migration data exists. A rollback restores the old behavior but must also restore documentation claims because the old process-scoped manager is not session-isolated.
