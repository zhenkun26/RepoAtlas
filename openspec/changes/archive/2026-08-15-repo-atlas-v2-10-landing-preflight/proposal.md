# v2.10 Read-only landing preflight

## Why

v2.9 can explain the next safe lifecycle action, but it cannot distinguish whether a created local commit is already present in the source branch, can be fast-forwarded, or conflicts with the current source history. Before any future landing or conflict-resolution feature, RepoAtlas needs a bounded observation surface that reports this relationship without executing it.

## What changes

- Add a session-only `inspect-landing` action for proposals whose local commit was created by the current session.
- Inspect source cleanliness, repository identity, recorded base revision, target commit availability, and local ancestry using fixed read-only Git commands.
- Return explicit `fast-forwardable`, `already-landed`, `source-ahead`, `diverged`, dirty, drift, unavailable, and unknown relations.
- Preserve the existing proposal snapshot and lifecycle/event state; do not add a lifecycle transition or event.
- Update OpenSpec, roadmap, security-boundary, Harness documentation, and state-machine tests.

## Scope boundary

- `inspect-landing` accepts only a known current-session `proposalId` and derives every path and revision from the registry.
- It does not merge, cherry-pick, rebase, reset, revert, resolve conflicts, remove worktrees, create commits, push, deploy, install dependencies, access network, or persist data.
- It does not treat a preflight relation as authorization or as proof that landing has happened.
- Missing, unknown, dirty, drifted, unavailable, or ambiguous facts fail safe and never return a successful execution claim.
