# github-repository-identity Specification

## Purpose
Define a stable canonical GitHub repository identity for the `dsh-repo-atlas` package while preserving the RepoAtlas product brand, runtime contracts, and historical release evidence.
## Requirements
### Requirement: The canonical repository SHALL use the dsh-repo-atlas name

The maintained public repository SHALL be `zhenkun26/dsh-repo-atlas` at `https://github.com/zhenkun26/dsh-repo-atlas`. Current package metadata, README, governance and release documentation, workflow links, and repository verification assertions MUST use this canonical identity with the appropriate URL suffix.

#### Scenario: A new visitor follows the repository metadata

- **WHEN** a visitor reads the package homepage, repository field, issue URL, README clone command, or current release/workflow link
- **THEN** the destination SHALL use `zhenkun26/dsh-repo-atlas` rather than the old `zhenkun26/RepoAtlas` path

### Requirement: The repository rename SHALL preserve project and release identity

Renaming the repository MUST preserve the `zhenkun26` owner, `main` default branch, existing commit history, tags, releases, visibility, license, source-first distribution posture, and `RepoAtlas / 代码星图` product attribution. Historical archived records MAY retain links to the former repository name.

#### Scenario: The rename is inspected after completion

- **WHEN** a maintainer inspects the renamed GitHub repository and local checkout
- **THEN** the new repository SHALL expose the prior project history and release state, and the local `origin` SHALL point to `https://github.com/zhenkun26/dsh-repo-atlas.git`

### Requirement: Repository identity migration SHALL not expand runtime authority

The rename and local reference update MUST NOT change Harness tool names, plugin runtime permissions, session-only state boundaries, dependency behavior, npm publication state, tag/release automation, deployment behavior, or remote operations performed by RepoAtlas at runtime.

#### Scenario: A maintainer reviews the completed change

- **WHEN** the repository identity migration passes its verification gates
- **THEN** the existing runtime and distribution boundaries SHALL remain unchanged and the change SHALL contain no automatic publish, tag, release, deployment, or runtime network capability
