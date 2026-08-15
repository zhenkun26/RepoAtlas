## Context

See `proposal.md` for the motivation. RepoAtlas currently keeps `AnalysisSession` and evidence in memory, exposes a read-only analysis tool, and has no proposal registry or worktree lifecycle. v1.2 cache and v1.3 AST evidence are session-local and must remain so. The source workspace may contain user changes, so the proposal flow must use the recorded `HEAD` revision and must never copy or overwrite the source tree.

## Goals / Non-Goals

**Goals:**

- Add a small session-only proposal registry with a prepare/confirm/release lifecycle.
- Make the confirmation digest bind the user approval to the exact target summary and base revision.
- Create only a detached worktree outside the source workspace, using fixed local Git commands and no shell interpolation.
- Return bounded, evidence-linked proposal data that distinguishes planning from patch application.
- Preserve abort, budget, path-policy, sensitive-path, and fail-closed semantics.

**Non-Goals:**

- Generating source code, applying patches, running tests, or modifying files in the worktree.
- Copying uncommitted source changes into the worktree.
- Commit, push, pull, remote access, deployment, dependency installation, or cross-session recovery.
- Extending scanner discovery, atlas reconstruction, report formatting, or the v1.2 cache lifecycle.

## Decisions

### Session-owned registry instead of persistence

Keep pending and confirmed proposals in an in-memory registry owned by the plugin/session instance. This preserves the existing session-only boundary and makes unknown, expired, or cross-session proposal ids fail closed. A workspace JSON file or database was rejected because it would create a new persistence surface and conflict with the cache/privacy boundary.

### Two-phase prepare and confirm API

Preparing a proposal validates the user request and returns a digest without creating a worktree. Confirming requires the proposal id and exact digest, then creates the worktree. A single call with an implicit boolean approval was rejected because it makes accidental approval and replay harder to detect.

### Fixed `git` subprocess adapter

Use Node.js process APIs with `shell: false`, fixed subcommands (`rev-parse`, `worktree add --detach`, `worktree remove`) and validated absolute paths. The adapter must not accept arbitrary command text or remote arguments. Reusing the existing arbitrary controlled-action recipe runner was rejected because a worktree operation needs a narrower argument contract and a separate confirmation boundary.

### HEAD-based detached worktree outside the source root

Resolve and record the repository root and `HEAD` before confirmation, then create a temporary worktree outside that root. Uncommitted source changes are deliberately excluded and left untouched. Creating a branch was rejected because the proposal does not apply or commit changes in this version and a detached worktree minimizes branch-state side effects.

### Proposal data is a bounded descriptor, not a patch

The proposal stores only user-supplied intent, validated relative paths, operation descriptors, bounded risk/limitation text, and existing evidence ids. It never stores full source text or secrets. Patch generation and application remain later work so this change does not silently become an auto-fix system.

### Explicit non-force release

Release validates the registry-owned worktree identity and uses a non-forcing local Git removal. Dirty or unowned worktrees remain in place with a failure result. Force deletion was rejected because it could destroy user work and would violate the project’s conservative destructive-action boundary.

## Risks / Trade-offs

- [Git is unavailable or the repository has no HEAD] → Return a bounded blocked result and leave the source workspace unchanged.
- [A temporary worktree outlives the process] → Keep its path and ownership visible in the result, provide explicit release, and never claim cross-session recovery.
- [The user manually edits the isolated worktree] → Non-force release refuses dirty worktrees and reports the retained path.
- [A confirmation is replayed] → Consume the pending proposal on successful confirmation and require a live registry entry and exact digest.
- [A repository path is a symlink or escapes containment] → Resolve real paths before validation and reject any source or target outside the approved roots.

## Migration Plan

1. Add the new proposal types, bounded validation, registry, and fixed Git adapter without changing existing analysis behavior.
2. Register the proposal tool alongside the existing read-only analysis tool; keep it disabled for requests lacking a confirmed session and explicit confirmation.
3. Add unit and integration fixtures for clean/dirty repositories, path rejection, digest mismatch, abort, budget, release, and no-network behavior.
4. Roll back by disabling the proposal tool and removing only the session-owned temporary worktree; no existing workspace or cache migration is required.
