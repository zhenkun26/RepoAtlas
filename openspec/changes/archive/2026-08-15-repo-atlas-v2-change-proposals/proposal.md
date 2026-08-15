## Why

RepoAtlas can now build a bounded, evidence-backed view of a repository, but it has no safe handoff for a user who wants to explore a code change. v2 adds that handoff while keeping the original workspace untouched and ensuring that a proposal is never mistaken for an approved patch.

## What Changes

- Add a session-only change-proposal lifecycle bound to a confirmed analysis session and a user-supplied change request.
- Validate proposed paths and operations against the confirmed workspace scope before creating any local artifact.
- Create a detached Git worktree outside the original workspace only after the user explicitly confirms the proposal digest.
- Return a bounded proposal containing the base revision, isolated worktree identity, intended paths and operations, supporting evidence ids, limitations, and risk status.
- Support explicit rejection, interruption, and release of session-owned worktrees without persisting proposal state or reading additional repository content automatically.
- Keep patch authoring, arbitrary file writes, commit, push, network access, deployment, and cross-session proposal recovery out of scope.

## Capabilities

### New Capabilities

- `isolated-change-proposals`: Generate and manage evidence-backed change proposals in an explicitly confirmed detached worktree while preserving the source workspace.

### Modified Capabilities

<!-- No existing requirement changes; the new capability defines its own v2 confirmation boundary. -->

## Impact

- Add session-only proposal types, lifecycle management, and a bounded proposal tool to the TypeScript source.
- Add a fixed, local-only Git worktree adapter using Node.js process APIs; no new package or remote service is required.
- Extend plugin/session integration and tests, without changing scanner discovery, analysis report generation, or v1.2 cache persistence semantics.
