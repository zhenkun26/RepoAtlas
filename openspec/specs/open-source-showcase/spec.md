# open-source-showcase Specification

## Purpose
Define the public-facing repository description and README contract for presenting RepoAtlas as an open-source DeepSeek Harness plugin without overstating implementation or distribution guarantees.
## Requirements
### Requirement: Project metadata SHALL provide an accurate concise description

The package metadata MUST identify RepoAtlas as a safety-first, evidence-backed repository-analysis and bounded change-lifecycle plugin for DeepSeek Harness. The description MUST preserve the source-first and session-only boundaries and MUST NOT claim npm publication, compiled distribution, or ordinary Node consumer import support.

#### Scenario: A visitor reads package metadata

- **WHEN** a visitor opens `package.json`
- **THEN** the description SHALL explain the project's purpose in concise English and remain consistent with `private: true`, source exports, and the `dsh.bundle` manifest

### Requirement: README SHALL communicate the open-source value proposition

The README MUST provide a concise project description, explain the evidence-backed analysis workflow, summarize the supported capability groups, and present a source-first quick-start path for DeepSeek Harness users.

#### Scenario: A new visitor evaluates the project

- **WHEN** a visitor reads the first sections of the README
- **THEN** they SHALL understand what RepoAtlas analyzes, what it produces, who it is for, and how to load it into a compatible Harness checkout

### Requirement: README SHALL preserve safety and distribution boundaries

The README MUST distinguish the default read-only analysis path from explicitly approved controlled actions and MUST state that evidence cache, proposal registry, lifecycle history, and preflight observations are session-only. It MUST explicitly state that the supported distribution is a source/plugin bundle, that npm publication and compiled distribution are not current contracts, and that proposals/preflights do not mean code patches, commits, landing, or release state have been applied.

#### Scenario: A user checks operational guarantees

- **WHEN** a user reads the safety and distribution sections
- **THEN** they SHALL find no implied shell, network, source-workspace write, automatic patch generation, automatic push, npm package, or support SLA guarantee

### Requirement: README SHALL expose open-source governance and evidence links

The README MUST link to the license, attribution notice, contribution guidance, security reporting, support policy, release process, roadmap, Harness integration, compatibility manifest, and relevant quality commands. It MUST retain the distinction between MIT notice/disclaimer obligations and the separate RepoAtlas / 代码星图 provenance request.

#### Scenario: A maintainer wants to reuse or contribute

- **WHEN** a maintainer follows the README governance links
- **THEN** they SHALL find the applicable license/source attribution wording, contribution and security routes, compatibility evidence, and local verification commands

