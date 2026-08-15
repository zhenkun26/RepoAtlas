# Changelog

All notable RepoAtlas changes will be documented here. Until the first public tag is created, entries are unreleased development history and do not imply an npm publication or a supported package version.

## [Unreleased]

No unreleased user-facing changes.

## [0.1.0] - 2026-08-15

### Added

- v2.11 session-only `inspect-release` readiness observation for managed worktrees.
- Source-first public release baseline: license, contribution and security guidance, CI gates, and release checklist.
- v2.13 source-distribution evaluation: local packed-install smoke, pinned public Harness compatibility manifest, and an explicit manual smoke workflow.
- v2.14 public-release preparation: proposed support policy, source-first release procedure, and read-only candidate preflight.

### Security

- Documented the boundary between advisory lifecycle observations and authorized execution.
- Added responsible disclosure guidance for boundary escapes and sensitive-data exposure.
- Kept external Harness clone/install and compatibility execution outside the RepoAtlas runtime and default quality workflow.

### Distribution and attribution

- The first public version remains source-first and is not an npm publication or compiled distribution.
- RepoAtlas is released under the MIT License; preserve the license notice and disclaimer.
- Public references, integrations, documentation, and derivative projects should identify RepoAtlas / 代码星图 and link to the source repository.

## Release policy

The first public version will be associated with an explicit Git tag and release notes. Package publication, compiled distribution, support policy, and version compatibility are still separate decisions tracked in [the roadmap](docs/roadmap.md) and [the release checklist](docs/release-checklist.md).
