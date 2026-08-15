## Why

RepoAtlas currently captures `process.cwd()` when the Harness plugin mounts, so a normal tool call can inspect the Harness checkout instead of the calling session workspace. The plugin also shares one proposal manager across every live Harness session, which makes the documented session-only boundary process-local rather than agent-session-local.

## What Changes

- **BREAKING** Require a live Harness tool execution with an agent session and immutable session cwd for Harness analysis and proposal lifecycle calls; missing runtime context fails closed instead of falling back to the Harness process directory.
- Resolve the analysis workspace from each invocation's `execution.agent.session.header.cwd` and forward the caller's `AbortSignal` through repository discovery and analysis.
- Partition analysis sessions, proposal registries, patches, commits, landings, event histories, and assessments by the exact live Harness session object.
- Ensure proposal ids and internal analysis session ids created in one Harness session are unavailable to every other Harness session, including `list` and read-only inspection actions.
- Resolve controlled-action roots from the same calling session workspace while preserving fixed recipes, approval, sandbox, path, output, and no-shell boundaries.
- Add two-workspace, two-session, missing-context, cancellation, and cross-session regression coverage.
- Preserve session-only in-memory storage, no network access, no automatic patch generation, and all existing explicit approval and digest gates.

## Capabilities

### New Capabilities

- `harness-session-runtime`: invocation-scoped workspace resolution, cooperative cancellation, and exact Harness-session ownership for all RepoAtlas runtime state.

### Modified Capabilities

- `controlled-actions`: controlled recipes derive their execution boundary from the calling Harness session instead of a plugin-mount process cwd.
- `isolated-change-proposals`: proposal ownership is bound to one live Harness session and cannot be addressed from sibling sessions.
- `proposal-listing`: list observes only the current Harness session's manager rather than the plugin process registry.

## Impact

- Affected code: `src/harness/plugin.ts`, `src/harness/public.ts`, controlled-action and proposal adapters, proposal-manager construction, and Harness/plugin tests.
- Affected behavior: direct calls to Harness tool objects without execution context must use the direct core API or explicit test fixtures; production Harness calls fail closed when agent/session/cwd/signal facts are unavailable.
- No persistent data migration exists because all affected state remains in memory and session-only.
- No dependency installation, remote access, commit, push, release, npm publication, cleanup, or workspace mutation is introduced.
