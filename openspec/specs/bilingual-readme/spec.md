# bilingual-readme Specification

## Purpose
Define bilingual language coverage for the public RepoAtlas README while preserving the technical and distribution contract.
## Requirements
### Requirement: Primary README sections SHALL be bilingual

The README MUST provide equivalent English and Chinese content for the project value proposition, rationale, capability summary, quick start, workflow, safety model, compatibility/support, distribution/release status, API/development guidance, governance, and documentation navigation.

#### Scenario: An English-speaking visitor evaluates RepoAtlas

- **WHEN** the visitor reads the README
- **THEN** the visitor SHALL find the existing concise English project description and the complete English onboarding and safety path

#### Scenario: A Chinese-speaking visitor evaluates RepoAtlas

- **WHEN** the visitor reads the README
- **THEN** the visitor SHALL find Chinese explanations beside the corresponding project, onboarding, safety, compatibility, distribution, and governance content rather than only an end-of-file summary

### Requirement: Bilingual content SHALL preserve technical facts

The English and Chinese README content MUST preserve the same commands, file paths, links, version pins, supported Node.js baseline, pinned Harness revision, source-first distribution decision, session-only boundaries, and the `dsh-repo-atlas/harness` bundle identity. Shared code blocks and identifiers SHOULD remain language-neutral to avoid copy/paste drift.

#### Scenario: A user copies the quick-start instructions

- **WHEN** the user follows either language's quick-start path
- **THEN** the commands SHALL load the same `dsh-repo-atlas/harness` bundle through the same source-first Harness path

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

### Requirement: The README SHALL explain the product before the implementation vocabulary

The README MUST begin with a plain-language explanation of the problem the plugin solves, the main user flow, and the default safety posture before introducing Harness bundle, GoalSpec, evidence cache, proposal lifecycle, or other implementation terms. English and Chinese explanations MUST be equivalent and suitable for a new user who has not previously used RepoAtlas.

#### Scenario: A first-time visitor scans the README

- **WHEN** the visitor reads the title, summary, and quick-start sections
- **THEN** the visitor SHALL understand that `dsh-repo-atlas` is a DeepSeek Harness plugin for evidence-backed repository understanding and reviewable change proposals, and SHALL know what it does not automatically execute

