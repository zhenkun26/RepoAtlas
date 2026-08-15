## Context

See `proposal.md` for the motivation. v2.2 stores an applied patch and a passed or non-passed verification result in session memory. The managed worktree is detached and can already be released safely when clean, but the Git adapter has no commit operation and its current identity calculation couples ownership to the initial HEAD revision.

## Goals / Non-Goals

**Goals:**

- Create exactly one explicitly confirmed local commit from a passed patch in the owned detached worktree.
- Make commit intent, approval, digest, changed paths, revision, and result auditable in the current session.
- Preserve a clean release path after a successful commit and preserve the worktree for human recovery after any uncertainty.

**Non-Goals:**

- No source workspace write, merge, cherry-pick, branch creation, remote/network access, push, deployment, dependency installation, patch generation, automatic rollback, or force cleanup.
- No arbitrary Git options, user-supplied commands, hooks, GPG signing, author override, or commit amendment.

## Decisions

1. **Use a separate commit draft state machine.** `prepare-commit` only validates and stores a bounded explicit message; `confirm-commit` requires the exact digest and host approval; `reject-commit` is terminal. This keeps commit creation distinct from patch application and prevents a patch confirmation from silently committing.

2. **Require patch application and verification success first.** A commit is not prepared for an unapplied patch, failed/blocked verification, unexpected changed path, or dirty/unknown worktree. This gives the commit action a narrow input boundary and avoids treating unverified code as deliverable.

3. **Make worktree identity stable independently of HEAD.** Ownership identity is derived from the canonical worktree path; the recorded base revision remains a separate immutable precondition. This allows a successful commit to change HEAD without making the worktree appear unowned, while manager checks still reject base-revision drift before commit.

4. **Use fixed Git operations and exact path staging.** The adapter stages only repository-relative paths derived from the confirmed patch, checks the staged path set, then invokes commit with `--no-verify`, `--no-gpg-sign`, `-m`, and `shell:false`. It never accepts arbitrary flags, remotes, author data, or commands.

5. **Keep commit uncertainty fail-closed.** If the subprocess result or postcondition cannot prove whether a commit was created, the result is `commit-creation-unknown`; the worktree is retained and no reset, unstage, clean, or force remove is attempted. A successful commit must leave the worktree clean so the existing safe release can remove it.

6. **Reuse Harness approval but not the controlled-action subprocess recipe.** Commit is a fixed local Git side effect, not a configurable test recipe. A small host approval authorizer records the approval audit id; the manager remains responsible for the fixed Git adapter call and all state transitions.

## Risks / Trade-offs

- [Risk] A failed commit can leave staged changes in the isolated worktree. → Retain the path, report commit-not-created, and refuse release while dirty; cleanup remains explicit and external.
- [Risk] Git can create a commit while its wrapper result is interrupted or inspection fails. → Report commit-creation-unknown and never claim non-creation or success; do not automatically reset the worktree.
- [Risk] Stable path identity could be reused if a worktree path is recreated. → Worktrees use unique temporary paths, and release still verifies the Git worktree listing plus session identity before removal.
- [Risk] Commit messages can contain secrets or excessive content. → Require a bounded explicit message and reject secret-like content before storing or committing it.

## Migration Plan

1. Add commit types and the isolated-worktree commit delta spec.
2. Add manager draft/confirmation transitions and a fixed local Git adapter operation.
3. Add Harness approval wiring and proposal-tool actions, then test fake and real temporary repositories.
4. Run full tests, lint, alternative TypeScript, native typecheck status, OpenSpec strict validation, and diff checks.
5. If disabled or unavailable, existing v2.2 patch apply/verify/export behavior remains unchanged; no data migration is required.

## Open Questions

None. Source landing/merge remains a separate future OpenSpec change.
