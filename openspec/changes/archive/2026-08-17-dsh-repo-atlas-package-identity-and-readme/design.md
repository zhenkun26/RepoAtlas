## Context

RepoAtlas is a DeepSeek Harness plugin whose public package identity currently looks like a generic repository project. A DSH-prefixed name makes the integration context visible at install and bundle-loading time, while RepoAtlas remains the product name used in the repository and documentation.

## Goals / Non-Goals

**Goals:**

- Make `dsh-repo-atlas` the single public package identity and `dsh-repo-atlas/harness` the visible Harness bundle identity.
- Keep existing tool-call names and runtime behavior compatible for current Harness callers.
- Make the README understandable within the first minute for both English- and Chinese-speaking users.
- Keep the source-first, private-package, MIT, attribution, and fail-closed claims accurate.

**Non-Goals:**

- Renaming the GitHub repository from `RepoAtlas`.
- Renaming `repo_atlas_analyze`, `repo_atlas_change_proposal`, or other existing tool API names.
- Publishing to npm, changing release state, or introducing package aliases for the old private name.
- Changing analysis permissions, controlled-action authority, session isolation, persistence, network behavior, or Harness compatibility pins.

## Decisions

### Public identity boundary

The following surfaces use the new identity:

| Surface | New value |
| --- | --- |
| package name | `dsh-repo-atlas` |
| Harness plugin export name | `dsh-repo-atlas` |
| bundle patch id | `dsh-repo-atlas` |
| Harness bundle display name | `dsh-repo-atlas/harness` |
| built artifact imports | `dsh-repo-atlas`, `dsh-repo-atlas/harness` |

The following remain stable:

| Surface | Reason |
| --- | --- |
| repository and product name `RepoAtlas` | keeps the project brand and canonical source link stable |
| tool names `repo_atlas_analyze`, `repo_atlas_change_proposal`, and controlled-action names | avoids breaking existing Harness tool callers |
| internal `RepoAtlas*` TypeScript symbols | implementation vocabulary is not the package identity |

### README structure

The README will lead with a one-sentence explanation and a concrete user flow, then provide paired English/Chinese sections for capabilities, quick start, workflow, safety boundaries, compatibility, source-first distribution, development, and governance. Commands and identifiers will remain in shared code blocks wherever possible.

### Migration

Because the package is still private and source-first, no old-name compatibility alias is needed. A user following the updated quick start will rebuild the checkout and add it to the Harness profile; the expected visible bundle becomes `dsh-repo-atlas/harness`. Existing tool calls continue using their current names.

## Risks / Trade-offs

- **Risk:** users may copy an old local bundle name from historical documentation. → Update current documentation and explicitly state the new bundle name; archived OpenSpec records remain historical evidence.
- **Risk:** a stale verification assertion could report a false failure. → Update package, patch, built-artifact, compatibility, and test assertions together, then run the full local gates.
- **Trade-off:** changing a private package identity is intentionally a breaking local-install identifier change. This is acceptable because the package is not published and the request prioritizes discoverability.

## Rollback

Revert the bounded package identity, patch, verification, documentation, and OpenSpec change commit together. No user workspace or persistent runtime state is migrated by this change.
