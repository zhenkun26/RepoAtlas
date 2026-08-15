# Design: v2.10 landing preflight

## Goals and non-goals

Goals:

- Give callers a deterministic, bounded relation between the current source HEAD and the session-created commit.
- Reuse the existing proposal registry and source/worktree identity checks.
- Keep the action read-only and independent from recovery guidance, lifecycle history, and landing mutation.

Non-goals:

- No landing, merge, conflict resolution, rollback, cleanup, or remote Git operation.
- No arbitrary paths, revisions, commands, or user-selected refs in the request.
- No persistence, cross-session lookup, patch generation/application, or new registry.

## Call chain and data flow

`repo_atlas_change_proposal(inspect-landing)` → validate current-session proposal → require a session-created commit → `ChangeProposalManager.inspectLanding` → `GitWorktreeAdapter.inspectSource` plus fixed local target/ancestry inspection → detached bounded result.

The manager derives the source workspace, expected base revision, managed worktree identity, and commit revision from the proposal record. The Harness input cannot override any of these values. The adapter uses `shell:false` and fixed Git argument vectors only.

## Relation decision table

| Precondition/fact | Relation | Result semantics |
| --- | --- | --- |
| proposal is known but has no created local commit | `not-applicable` | available registry observation; no Git target check |
| source inspection fails or target revision cannot be verified | `unknown` / `target-unavailable` | unknown, bounded reason, no success claim |
| source repository/path identity is not proven | `unknown` | fail safe; no ancestry conclusion |
| source is dirty | `source-dirty` | available fact, but not safe to execute landing |
| source HEAD differs from recorded proposal base revision | `source-revision-drift` | available fact, no fast-forward conclusion |
| source HEAD equals target commit | `already-landed` | source already contains the exact target revision |
| source HEAD is an ancestor of target | `fast-forwardable` | local fast-forward relation only; landing not performed |
| target is an ancestor of source HEAD | `source-ahead` | target is already contained by a newer source revision |
| neither revision is an ancestor of the other | `diverged` | manual conflict/landing decision is outside this action |

Dirty source takes precedence over ancestry. Exact equality is reported as `already-landed`; when the target is already an ancestor of source, `source-ahead` may still be reported alongside `baseRevisionMatches=false` so callers can distinguish “already contained” from an unrelated drift. A drift that has no stronger relation is reported as `source-revision-drift`. No relation except a clean, base-matching ancestor is a landing-ready conclusion.

## Types and output

Add a bounded `ChangeProposalLandingAssessment` to the existing proposal result. It contains `status`, `relation`, bounded `reason`, `checkedAt`, `sessionOnly=true`, and only safe revision/boolean facts already needed for the observation. It contains no absolute paths, patch text, digest, command, or approval data.

`status` is `available`, `not-applicable`, or `unknown`. `relation` is a finite union: `not-applicable`, `fast-forwardable`, `already-landed`, `source-ahead`, `diverged`, `source-dirty`, `source-revision-drift`, `target-unavailable`, and `unknown`.

Unknown proposal IDs return the existing blocked result without adapter access. Known proposals without a created commit return `not-applicable`. Adapter errors are redacted and do not mutate nested operation status, lifecycle status, or history.

## Invariants

1. The action calls no mutating adapter method and appends no lifecycle event.
2. Every adapter path and revision comes from a validated proposal record; caller input cannot select them.
3. `fast-forwardable` is returned only after source identity, cleanliness, base revision, target revision, and ancestry are all confirmed.
4. Dirty, base drift, target-unavailable, inspection failure, and abort states never become a positive landing conclusion.
5. Results are detached snapshots; repeated calls on unchanged local state do not change registry state or counters.
6. Output remains session-only and omits absolute paths and changed path names.

## Failure and recovery

- Unknown or missing proposal ID: return blocked, with no summary or adapter access.
- Missing commit or non-created/uncertain commit state: return not-applicable or unknown without attempting Git mutation.
- Source inspection, target verification, or ancestry failure: return bounded unknown/target-unavailable; do not infer success.
- AbortSignal: return interrupted/unknown observation according to existing manager conventions; do not transition lifecycle state.
- A future landing action must re-check live state; this preflight is advisory and never grants permission.

Rollback is code-only: remove the v2.10 source, tests, documentation, and active OpenSpec change. The feature itself creates no runtime artifacts to recover.

## Pre-code rehearsal

- Touchpoints: `src/types.ts`, `src/repository/change-proposal.ts`, `src/harness/change-proposal-tool.ts`, plugin/tool tests, roadmap, security boundary, Harness integration, and a new landing-preflight spec.
- Mutation audit: the call chain ends after fixed read-only Git inspection; it must not call `land`, `commit`, `remove`, patch operations, approval, Goal, sandbox, or subprocess APIs outside the adapter's existing `shell:false` runner.
- Test isolation: fake adapters expose an inspection counter and assert commit/land/remove/event counters remain unchanged; temporary repositories cover every ancestry relation.
- Stop condition: any requirement to perform landing, conflict resolution, rollback, or cleanup becomes a separate OpenSpec change.

## Verification evidence

- Manager tests cover no-commit, fast-forwardable, already-landed, source-ahead, diverged, dirty, revision drift, target unavailable, unknown proposal, abort, detached result, and no-mutation behavior.
- Harness tests cover action registration, input validation, success, blocked, and compatibility with existing actions.
- Full tests, lint, native and independent TypeScript checks, OpenSpec strict validation, and `git diff --check` are required.
