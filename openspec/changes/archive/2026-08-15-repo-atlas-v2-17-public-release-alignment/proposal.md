## Why

RepoAtlas now has a bilingual open-source README and a source-first release process, but the public repository state is not yet aligned with that presentation. The existing `v0.1.0` tag points to the pre-bilingual README snapshot, GitHub has no Release for that tag, and the repository About description is empty even though local package metadata is descriptive. The changelog and release checklist also need one authoritative interpretation of the tag, candidate, and GitHub Release states.

Without an explicit alignment change, a maintainer could publish an outdated tag, describe a candidate as already released, or leave the GitHub project page undiscoverable while the source repository itself is correct.

## What changes

- Define the immutable relationship between the existing `v0.1.0` tag and the current `main` candidate; never move or overwrite the existing tag.
- Prepare one reviewed source-first release candidate whose package version, changelog section, README release status, release checklist, and release procedure agree.
- Record the recommended GitHub About description, homepage, and topic set as manual release metadata; do not mutate GitHub through repository runtime or automation.
- Make the local release preflight and documentation distinguish candidate readiness, an existing tag, a GitHub Release, npm publication, and deployment.
- Preserve `private: true`, source/plugin-bundle distribution, MIT obligations, RepoAtlas / 代码星图 attribution guidance, and all session-only/runtime boundaries.

## Capabilities

### New Capabilities

- `public-release-alignment`: a source-first release-candidate and repository-presentation contract that prevents stale or overstated public release claims.

## Impact

- Affected areas: `package.json`, `README.md`, `CHANGELOG.md`, `docs/release-checklist.md`, `docs/release-process.md`, `docs/roadmap.md`, release-preflight tooling/tests, and this OpenSpec change.
- No runtime action, Harness action schema, evidence cache, proposal registry, lifecycle history, or preflight session-state model changes.
- No tag movement, GitHub Release creation, remote metadata mutation, npm publication, network access, dependency installation, push, deployment, or cleanup is implemented by this change.
