## Why

The package and Harness bundle are already named `dsh-repo-atlas`, but the canonical GitHub repository is still named `RepoAtlas`. Renaming the repository now removes the public identity mismatch before more users copy clone, issue, release, and provenance links.

## What Changes

- Rename the GitHub repository from `zhenkun26/RepoAtlas` to `zhenkun26/dsh-repo-atlas`.
- Update current package metadata, README, governance/release documentation, workflow links, and verification scripts to use the new canonical repository URL.
- Update the local `origin` URL to the renamed repository.
- Preserve the product brand `RepoAtlas / 代码星图`, existing Harness tool names, runtime authority boundaries, history, tags, releases, and source-first distribution posture.
- Preserve old repository links in archived OpenSpec records as historical evidence.

## Capabilities

### New Capabilities

- `github-repository-identity`: Define the canonical GitHub repository identity and the invariants for a safe repository rename.

### Modified Capabilities

- `public-plugin-identity`: Require the public repository identity to align with the `dsh-repo-atlas` package and Harness bundle while keeping the RepoAtlas product brand and tool API stable.

## Impact

- Affected local files include `package.json`, README/governance/release documentation, workflow and release links, and the release-preflight attribution check.
- The GitHub repository metadata and local `origin` remote are changed; no source runtime, dependency, or API behavior changes.
- GitHub's redirect behavior is relied on only as a transition aid; current committed references use the new canonical URL.
