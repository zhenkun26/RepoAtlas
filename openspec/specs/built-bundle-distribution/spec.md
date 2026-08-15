# built-bundle-distribution Specification

## Purpose
Define a reproducible compiled RepoAtlas package that can be installed and imported without a consumer-side TypeScript source loader, while keeping publication separately authorized.
## Requirements
### Requirement: The package SHALL expose compiled ESM and declarations

The package MUST build every public root and Harness entry into ESM JavaScript under `dist/`, MUST emit corresponding TypeScript declarations, and MUST rewrite relative TypeScript import extensions to executable JavaScript extensions. Package exports MUST resolve runtime and type consumers to those built files.

#### Scenario: A consumer imports the packed package
- **WHEN** a task-owned offline consumer installs the locally packed artifact and imports both `repo-atlas` and `repo-atlas/harness` using plain supported Node.js
- **THEN** both imports SHALL resolve from `dist/` without `tsx`, `--experimental-strip-types`, a Harness source checkout, or install-time build scripts

### Requirement: The artifact SHALL use an explicit minimal allowlist

The packed artifact MUST include built JavaScript, declarations, bundle patch metadata, README, LICENSE, NOTICE, and package metadata. It MUST NOT include `src/`, tests, examples, OpenSpec work files, local reference checkouts, coverage, credentials, or task-owned caches.

#### Scenario: Package contents are inspected
- **WHEN** the built-artifact smoke reads `npm pack --json` output
- **THEN** every required file SHALL be present, every runtime export SHALL point inside `dist/`, and prohibited source/development paths SHALL be absent

### Requirement: Local artifact verification SHALL not publish

The repository MUST provide one repeatable build/pack/offline-install/import verification that operates in task-owned temporary directories and cleans them afterward. It MUST keep `private: true` and MUST NOT publish, tag, release, push, deploy, access a registry, or commit generated output.

#### Scenario: A maintainer verifies distribution readiness
- **WHEN** the built-artifact verification succeeds
- **THEN** it SHALL report only local artifact readiness and SHALL NOT imply an npm package, GitHub Release, support SLA, or publication authorization

#### Scenario: Build or import fails
- **WHEN** compilation, package contents, offline installation, root import, or Harness import fails
- **THEN** verification SHALL fail with bounded diagnostics and SHALL NOT fall back to raw `.ts` loading or network installation
