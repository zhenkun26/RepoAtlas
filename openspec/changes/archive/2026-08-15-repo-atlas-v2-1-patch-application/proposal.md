## Why

RepoAtlas v2 can prepare an evidence-backed change proposal and create a clean, detached worktree after explicit confirmation, but it stops before a proposed change can be reviewed as a concrete patch. The next bounded capability should let a user or host provide a patch draft, have RepoAtlas validate it against the confirmed proposal, and explicitly apply it only inside the session-owned worktree.

This change deliberately does not make RepoAtlas synthesize source code from natural-language intent. The caller remains responsible for producing the patch text; RepoAtlas provides the safety boundary, digest binding, bounded validation, isolated application, and auditable result.

## What Changes

- Add a session-only patch draft lifecycle bound to an existing confirmed change proposal.
- Accept only bounded unified diff input supplied explicitly by the user or host; reject unsupported binary, rename, mode-change, submodule, and path-escape forms.
- Require patch paths and operations to match the confirmed proposal targets and current safety policy.
- Require a second exact digest confirmation before applying a patch to the proposal's clean, session-owned detached worktree.
- Apply patches with fixed local Git operations and `shell: false`; never write the source workspace or invoke arbitrary commands.
- Return patch digest, bounded file/hunk summary, apply status, limitations, and explicit commit/push non-execution states.
- Preserve dirty-worktree refusal and non-force release behavior after patch application.

## Capabilities

### New Capabilities

- `bounded-patch-application`: Validate, confirm, and apply a user-supplied bounded patch only to a confirmed session-owned isolated worktree.

### Modified Capabilities

- `isolated-change-proposals`: Extend confirmed proposals with a session-only patch draft and application state while preserving the v2 proposal, worktree, and release boundaries.

## Impact

- Extend proposal types, limits, state transitions, the local Git adapter, and the existing Harness proposal tool.
- Add bounded unified-diff validation and patch lifecycle tests using fake adapters and temporary Git repositories.
- Keep scanner discovery, report generation, v1.2 cache persistence semantics, v1.3 AST evidence, and v2 source-workspace isolation unchanged.
- No new dependency, network service, persistent store, model call, commit, push, deployment, or dependency installation is required.
