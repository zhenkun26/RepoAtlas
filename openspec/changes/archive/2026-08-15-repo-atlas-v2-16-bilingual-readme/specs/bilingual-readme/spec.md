# bilingual-readme Specification

## Purpose

Define bilingual language coverage for the public RepoAtlas README while preserving the technical and distribution contract.

## Requirements

## ADDED Requirements

### Requirement: Primary README sections SHALL be bilingual

The README MUST provide equivalent English and Chinese content for the project value proposition, rationale, capability summary, quick start, workflow, safety model, compatibility/support, distribution/release status, API/development guidance, governance, and documentation navigation.

#### Scenario: An English-speaking visitor evaluates RepoAtlas

- **WHEN** the visitor reads the README
- **THEN** the visitor SHALL find the existing concise English project description and the complete English onboarding and safety path

#### Scenario: A Chinese-speaking visitor evaluates RepoAtlas

- **WHEN** the visitor reads the README
- **THEN** the visitor SHALL find Chinese explanations beside the corresponding project, onboarding, safety, compatibility, distribution, and governance content rather than only an end-of-file summary

### Requirement: Bilingual content SHALL preserve technical facts

The English and Chinese README content MUST preserve the same commands, file paths, links, version pins, supported Node.js baseline, pinned Harness revision, source-first distribution decision, and session-only boundaries. Shared code blocks and identifiers SHOULD remain language-neutral to avoid copy/paste drift.

#### Scenario: A user copies the quick-start instructions

- **WHEN** the user follows either language section
- **THEN** the commands SHALL load the same `repo-atlas/harness` bundle through the same source-first Harness path

### Requirement: Bilingual content SHALL not expand release or runtime claims

The README MUST continue to state that the core path is read-only by default, controlled actions are opt-in and gated, npm publication and compiled distribution are not current contracts, and proposals/preflights/landing observations are not proof of applied code or release state.

#### Scenario: A reader compares the two languages

- **WHEN** the reader compares English and Chinese safety/distribution sections
- **THEN** neither language SHALL imply Shell/network access, automatic patch generation, automatic push, npm publication, an SLA, or arbitrary Harness compatibility

### Requirement: README governance links SHALL remain available in both languages

The README MUST expose equivalent English and Chinese guidance to the MIT license, separate RepoAtlas / 代码星图 attribution request, contribution route, security route, support policy, release process, and roadmap. Local documentation links MUST remain valid.

#### Scenario: A maintainer wants to reuse or contribute

- **WHEN** the maintainer reads either language's governance section
- **THEN** the maintainer SHALL be able to reach the same authoritative license, attribution, contribution, security, support, release, and roadmap documents
