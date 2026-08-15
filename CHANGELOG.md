# Changelog

All notable RepoAtlas changes will be documented here. Until the first public tag is created, entries are unreleased development history and do not imply an npm publication or a supported package version.

## [Unreleased]

### Added

- v2.11 session-only `inspect-release` readiness observation for managed worktrees.
- Source-first public release baseline: license, contribution and security guidance, CI gates, and release checklist.
- v2.13 source-distribution evaluation: local packed-install smoke, pinned public Harness compatibility manifest, and an explicit manual smoke workflow.

### Security

- Documented the boundary between advisory lifecycle observations and authorized execution.
- Added responsible disclosure guidance for boundary escapes and sensitive-data exposure.
- Kept external Harness clone/install and compatibility execution outside the RepoAtlas runtime and default quality workflow.

## Release policy

The first public version will be associated with an explicit Git tag and release notes. Package publication, compiled distribution, support policy, and version compatibility are still separate decisions tracked in [the roadmap](docs/roadmap.md) and [the release checklist](docs/release-checklist.md).
