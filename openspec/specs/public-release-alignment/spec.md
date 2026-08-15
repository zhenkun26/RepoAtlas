# public-release-alignment Specification

## Purpose
Define a source-first release-candidate contract that keeps RepoAtlas's local version, immutable tags, public-facing documentation, and manual release handoff consistent without performing remote release operations.
## Requirements
### Requirement: Existing public tags SHALL remain immutable

The project release process MUST treat every existing public tag, including `v0.1.0`, as immutable historical state. A newer README or release candidate MUST NOT be represented by moving, deleting, recreating, or overwriting an existing tag.

#### Scenario: Current main contains improvements after an existing tag

- **WHEN** the reviewed `main` revision contains changes after `v0.1.0`
- **THEN** the release documents SHALL identify the exact tag revision and prepare a distinct next candidate rather than retagging `v0.1.0`

### Requirement: Release candidate facts SHALL be internally consistent

The package version, changelog, README release status, release checklist, release procedure, and roadmap MUST agree on the selected source-first release candidate and MUST distinguish it from an existing tag and a completed GitHub Release. A candidate or local preflight result MUST NOT be described as a completed release.

#### Scenario: A maintainer reviews the next candidate

- **WHEN** the maintainer compares the version and release documents
- **THEN** the maintainer SHALL find one exact candidate version and reviewed revision, with no contradictory claim about tag, GitHub Release, npm publication, deployment, or support SLA

### Requirement: Public repository metadata SHALL have a manual handoff contract

The release documentation MUST provide a concise, accurate recommended GitHub About description, homepage guidance, and topic guidance. The repository tooling MUST treat these values as manual handoff data and MUST NOT mutate GitHub metadata, call a remote API, or require network access.

#### Scenario: A maintainer prepares the repository page

- **WHEN** the maintainer follows the release handoff
- **THEN** the maintainer SHALL have reviewable metadata values and SHALL understand that applying them is a separate authorized GitHub operation

### Requirement: Source-first distribution boundaries SHALL remain explicit

The release candidate MUST preserve `private: true`, source/plugin-bundle distribution, MIT license and disclaimer obligations, and RepoAtlas / 代码星图 attribution guidance. It MUST NOT imply an npm package, compiled distribution, ordinary Node consumer import contract, or adopted support SLA.

#### Scenario: A reader evaluates the release status

- **WHEN** the reader compares the English and Chinese release guidance
- **THEN** both languages SHALL communicate the same source-first, no-npm, no-compiled-distribution, and no-SLA status

### Requirement: Release preflight SHALL remain local and advisory

The release preflight MAY inspect fixed local Git revisions and repository documents, but MUST remain shell-free where applicable, network-free, read-only, and detached from remote GitHub Release state. A `ready` result MUST remain candidate evidence rather than authorization or proof of release completion.

#### Scenario: The local candidate passes preflight

- **WHEN** all local candidate checks pass
- **THEN** the result SHALL identify local readiness and SHALL continue to report that tag creation, GitHub Release creation, npm publication, push, deployment, and remote metadata mutation were not performed
