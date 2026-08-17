## Context

The package metadata, Harness bundle, and public README already use `dsh-repo-atlas`, while the GitHub remote and several current public links still use `zhenkun26/RepoAtlas`. The change crosses repository metadata, documentation, verification scripts, and one external GitHub operation. Existing tool names, session-only state, source-first delivery, and runtime safety boundaries are not part of the migration.

## Goals / Non-Goals

**Goals:**

- Make `https://github.com/zhenkun26/dsh-repo-atlas` the canonical current repository URL.
- Rename the remote repository without changing its owner, default branch, history, tags, releases, visibility, or source contents.
- Update current local references and verify that the package and public documentation no longer advertise the old name.
- Record bounded evidence for both the external rename and the local metadata migration.

**Non-Goals:**

- Renaming `RepoAtlas / 代码星图` as the product or changing any `repo_atlas_*` tool name.
- Changing Harness runtime behavior, permissions, dependencies, npm publication, tags, releases, deployment, or Git history.
- Rewriting archived OpenSpec records or historical release evidence.

## Decisions

### Use the authenticated GitHub CLI for the single remote mutation

The maintainer-approved operation is `gh repo rename dsh-repo-atlas --repo zhenkun26/RepoAtlas --yes`. This uses the existing authenticated GitHub account and makes the repository rename explicit and reviewable. Direct API scripting or browser automation would add unnecessary credential and UI-state dependencies.

### Establish invariants before the remote call

Before renaming, verify a clean `main` checkout, no active OpenSpec change other than this one, the expected owner/name, and the target name's availability through `gh repo view`. The operation must preserve `zhenkun26`, `main`, history, tags, releases, visibility, and the source-first/private package posture. If the preflight cannot establish these facts, do not invoke the mutation.

### Use one canonical URL replacement for current references

Current committed metadata, documentation, workflow links, and verification assertions will use `https://github.com/zhenkun26/dsh-repo-atlas`, with `.git`, `/issues`, `/actions/...`, `/releases/...`, or `#readme` suffixes as appropriate. Archived change records remain untouched because their old links describe historical state.

### Verify both remote and repository content after migration

After the rename, inspect the new GitHub repository identity, update and inspect the local `origin`, search current files for stale repository URLs, and run the existing quality and OpenSpec gates. A remote rename is not considered complete if local canonical references or the release-preflight attribution assertion still point at the old name.

## Risks / Trade-offs

- [GitHub authentication or network failure] → Keep the remote unchanged, report the bounded error, and finish only local preparation if possible; do not fabricate success.
- [Target repository name already exists or rename is rejected] → Do not overwrite or delete anything; report the conflict and request a different target.
- [Remote rename succeeds but the local remote remains stale] → Set `origin` explicitly to the new `.git` URL and verify `git remote -v`.
- [Partial current-reference update] → Search all non-archived tracked content for the old canonical URL and run package/release-preflight checks before completion.
- [Need to undo the migration] → Rename the GitHub repository back through the authenticated GitHub CLI, restore the local remote URL, and revert only the local metadata commit; no history rewrite or destructive Git command is required.

## Migration Plan

1. Create and validate this OpenSpec change while the checkout is clean.
2. Confirm the current GitHub repository identity and target-name availability with read-only `gh repo view` calls.
3. Execute the single authorized GitHub repository rename.
4. Update current local URLs, README wording, package metadata, verification assertions, and `origin`.
5. Run local tests/build/quality/OpenSpec checks and inspect the renamed remote.
6. Mark the change complete, archive it, and commit the local reference updates. Push only the resulting normal repository commit; no tags, releases, npm publication, or deployment are involved.

## Open Questions

None. The target owner, target name, canonical URL, and non-goals are fixed by this change.
