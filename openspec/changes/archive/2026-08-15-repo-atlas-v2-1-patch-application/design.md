## Context

RepoAtlas v2 owns an in-memory proposal registry and can create a clean detached worktree from a recorded `HEAD` revision. Its proposal contains intent, bounded targets, evidence ids, and explicit `patch-not-applied`, `commit-not-created`, and `push-not-performed` states. v2 intentionally leaves patch authoring and application to a later capability.

The v2.1 boundary is a controlled handoff for a concrete patch. A user or host supplies the patch text; RepoAtlas does not call a code-generation model or infer source edits from the intent. The patch must remain session-only, be bound to the exact proposal and worktree, and be applied only after a separate explicit confirmation.

## Goals / Non-Goals

**Goals:**

- Validate a bounded unified diff against the confirmed proposal's target paths and operations.
- Produce a session-only patch draft with a deterministic digest and bounded summary before any worktree mutation.
- Require a second exact digest confirmation and a clean, identity-matching worktree before application.
- Apply only to the detached worktree created by the current proposal manager, using fixed local Git operations with `shell: false`.
- Report whether the patch was applied, not applied, or has an unknown result after interruption or postcondition failure.
- Preserve non-force release and explicit non-execution of commit, push, deployment, network, and dependency installation.

**Non-Goals:**

- Synthesizing source code from natural-language intent, repository evidence, or an analysis report.
- Applying patches to the source workspace, another worktree, an unowned path, or a remote repository.
- Binary patches, renames, copies, file-mode or submodule changes, arbitrary Git options, shell commands, or network access.
- Automatic commit, push, pull, deployment, dependency installation, or cross-session patch recovery.
- Automatic rollback, force deletion, or silent cleanup of a dirty worktree after patch application.
- Extending scanner discovery, reports, evidence cache persistence, AST analysis, or proposal target scope.

## Invariants and Failure Controls

1. The source workspace is never a write target. All patch application paths must resolve to the current proposal's recorded worktree and remain outside the source workspace.
2. A patch may be prepared and applied only for a proposal with status `confirmed`, an identity-matching managed worktree, and the recorded base revision.
3. The patch digest binds the proposal id, original proposal digest, base revision, worktree identity, canonical patch bytes, and normalized patch summary. Any mismatch fails closed without invoking Git apply.
4. Every patch path must be relative, normalized, non-sensitive, non-excluded, within the confirmed GoalSpec scope, and present in the proposal's confirmed targets with the same operation. Unexpected paths after application are a bounded failure, not a successful result.
5. Patch size, file count, hunk count, line lengths, and summary text are bounded. Secret-like patch content is rejected rather than redacted into an invalid patch.
6. Patch application never creates a commit, changes a remote, uses a force option, or claims that a proposal was committed or pushed.
7. If Git apply is interrupted or its postcondition cannot be established, the result records an unknown/blocked patch state and retains the worktree path. The system never claims a clean non-application when mutation may have occurred.
8. Release continues to refuse dirty worktrees. A user must review and manually clean an applied worktree before the existing non-force release action can remove it.

## Decisions

### Caller-supplied unified diff

The patch input is an explicitly supplied bounded unified diff. This keeps code synthesis outside RepoAtlas, where no model-generation contract currently exists, and makes the exact bytes available for digest confirmation. RepoAtlas creates an auditable draft descriptor and summary rather than pretending to generate source changes from an intent string.

### Separate patch prepare and apply confirmation

`prepare-patch` parses and validates the diff, checks the proposal/worktree preconditions, and returns a patch digest without writing files. `confirm-patch` requires the exact digest and re-checks the live worktree immediately before invoking Git. Replays return the existing applied or terminal state and never apply the same draft twice.

### Narrow unified-diff grammar

The validator accepts text patches that describe add, modify, and delete operations for regular files. It rejects absolute paths, traversal, `/dev/null` misuse, binary data, rename/copy metadata, mode changes, submodules, unsupported headers, and targets not covered by the proposal. It uses the existing path, sensitive-content, exclusion, and GoalSpec scope policies rather than introducing a second policy system.

### Fixed local application adapter

The Git adapter receives only the validated worktree path and canonical patch bytes and invokes a fixed local `git apply` command through a non-shell child process. It performs a bounded preflight check, applies without `--reject`, `--3way`, `--index`, or remote arguments, and inspects the resulting worktree. Patch bytes are streamed from session memory or a process pipe; no patch file is persisted in the source workspace.

### No automatic rollback after a dirty result

An applied patch intentionally makes the review worktree dirty. Automatic inverse application or force cleanup could erase manual review edits or partially applied work. The system therefore reports the retained path and requires the user to clean the worktree before the existing safe release flow can proceed.

## State Model

The proposal's v2 lifecycle remains authoritative (`awaiting-confirmation` → `confirmed` → `released`/terminal failure). A confirmed proposal gets an independent patch state:

| Current patch state | Action | Result |
| --- | --- | --- |
| `not-prepared` | `prepare-patch` with valid input | `awaiting-confirmation` |
| `not-prepared` | invalid input, unknown proposal, dirty/unowned worktree | `blocked` with no patch write |
| `awaiting-confirmation` | matching `confirm-patch` | `applied` if postconditions pass |
| `awaiting-confirmation` | digest mismatch | remains `awaiting-confirmation`, no Git apply |
| `awaiting-confirmation` | explicit reject | `rejected`, no Git apply |
| `awaiting-confirmation` | expiry or abort before apply | `blocked` or `interrupted`, no claimed apply |
| `applied` or any terminal state | replay | returns existing state, no second apply |
| any state | live identity/revision/path failure | `blocked`, worktree retained |

If apply or its postcondition may have mutated the worktree but the final result cannot be proven, the patch execution status is `patch-application-unknown` and the worktree is retained for review; it is never reported as `patch-not-applied`.

## Implementation Touchpoints and Pre-Code Rehearsal

- `src/types.ts`: add bounded patch input, summary, digest, execution, and patch-state types without changing session persistence boundaries.
- `src/repository/change-proposal.ts`: add patch validation, digest-bound prepare/confirm transitions, fixed Git apply/inspect operations, and terminal failure handling.
- `src/harness/change-proposal-tool.ts`: expose `prepare-patch`, `confirm-patch`, and patch rejection using the existing tool registration and signal path.
- `src/harness/plugin.ts`: preserve the existing manager instance and proposal-tool registration; no new global registry.
- `test/change-proposal.test.ts`: cover legal and illegal patch transitions, target/policy bounds, digest replay, abort, dirty worktree, and real temporary Git application.
- `test/plugin.test.ts`: verify the extended action schema and compatibility with the existing analysis tool.

The call chain is `repo_atlas_change_proposal` → session-owned `ChangeProposalManager` → proposal/worktree identity checks → fixed local Git adapter → `git apply` and status inspection. No network, arbitrary process, persistent store, source-workspace write, or external service is reachable from this chain. Fake adapters and temporary repositories must isolate shared maps and delete only their own temporary fixtures after each test.

Likely implementation mistakes are applying before digest confirmation, accepting a target outside the original proposal, using `--3way` or `--reject`, treating an interrupted apply as clean, and allowing release to force-remove a dirty worktree. Each is detected by the state-transition, argument-contract, and temporary-Git integration tests in the task list.

Implementation must stop and return to specification review if safe patch parsing requires a new dependency, if the caller expects natural-language source generation, if the patch cannot be streamed without persisting it, or if a requested behavior would write the source workspace or enable commit/push/deployment.

## Risks / Trade-offs

- [A patch is syntactically valid but targets a different operation] → Compare parsed operations to confirmed proposal targets and reject before Git.
- [The worktree changes between prepare and apply] → Require clean status, re-check identity/base revision, and fail closed before apply.
- [Git apply is interrupted or postconditions are ambiguous] → Return `interrupted`/`blocked` with `patch-application-unknown` and retain the path.
- [Patch content contains a secret] → Apply existing secret-like detection and reject the draft without storing a redacted, invalid patch.
- [The applied worktree cannot be released automatically] → Keep the path visible; refuse force removal and require manual cleanup before safe release.

## Rollback / Recovery Plan

No persistent migration is needed. Before implementation is archived, disable the new patch actions if any acceptance gate fails; existing v2 prepare/confirm/reject/release actions remain available. For a runtime failure after apply, preserve the session-owned worktree and its audit result, do not force-delete it, and require manual review/cleanup. Rollback of code consists of removing the v2.1 patch-handling changes while leaving the existing v2 registry and worktree adapter intact.
