# bilingual-readme Specification Delta

## MODIFIED Requirements

### Requirement: Bilingual content SHALL preserve technical facts

The English and Chinese README content MUST preserve the same commands, file paths, links, version pins, supported Node.js baseline, pinned Harness revision, source-first distribution decision, session-only boundaries, and the `dsh-repo-atlas/harness` bundle identity. Shared code blocks and identifiers SHOULD remain language-neutral to avoid copy/paste drift.

#### Scenario: A user copies the quick-start instructions

- **WHEN** the user follows either language's quick-start path
- **THEN** the commands SHALL load the same `dsh-repo-atlas/harness` bundle through the same source-first Harness path

## ADDED Requirements

### Requirement: The README SHALL explain the product before the implementation vocabulary

The README MUST begin with a plain-language explanation of the problem the plugin solves, the main user flow, and the default safety posture before introducing Harness bundle, GoalSpec, evidence cache, proposal lifecycle, or other implementation terms. English and Chinese explanations MUST be equivalent and suitable for a new user who has not previously used RepoAtlas.

#### Scenario: A first-time visitor scans the README

- **WHEN** the visitor reads the title, summary, and quick-start sections
- **THEN** the visitor SHALL understand that `dsh-repo-atlas` is a DeepSeek Harness plugin for evidence-backed repository understanding and reviewable change proposals, and SHALL know what it does not automatically execute
