# Design: v2.16 bilingual README

## Goals and non-goals

Goals:

- Make the primary open-source visitor journey readable in English and Chinese.
- Keep the English copy as the canonical concise project description while providing equivalent Chinese context.
- Keep technical commands, identifiers, paths, revisions, and links copyable and language-neutral.
- Preserve every existing safety, source-first, no-npm, no-SLA, MIT, attribution, and release-state boundary.

Non-goals:

- No runtime code, package metadata, action schema, test contract, or Harness integration change.
- No translation of source code, OpenSpec historical artifacts, or every linked document.
- No new claims about npm, compiled distribution, public release, arbitrary Harness versions, performance, or support SLA.
- No duplicated commands that could drift; bilingual prose surrounds shared command blocks.

## Layout

The README retains one shared command/code block where possible. Each primary section uses:

1. an English heading or paragraph;
2. the corresponding Chinese heading or paragraph;
3. shared tables, commands, links, and identifiers where translation would add drift.

The following visitor-facing sections must have paired language content:

- project value proposition;
- why RepoAtlas;
- capabilities;
- quick start and requirements;
- workflow and safety model;
- compatibility and support;
- distribution and release status;
- direct API and development verification;
- open-source governance and documentation navigation.

## Wording constraints

- “Read-only by default” and “默认只读” describe the core analysis path; controlled actions remain opt-in and approval/sandbox-gated.
- “Session-only” and “仅限当前 session” must not imply persistence, cross-session state, or upload.
- Proposal, preflight, commit, and landing observations must not be described as applied code changes or completed release state.
- The Chinese content must preserve the distinction between MIT notice/disclaimer requirements and the separate RepoAtlas / 代码星图 provenance request.

## Verification evidence

- OpenSpec strict validation passes for the new change.
- A focused README audit confirms each required primary section has English and Chinese content.
- All local README links remain valid, and commands/revisions match the repository files.
- Existing tests, lint, typecheck, source artifact, release preflight, strict OpenSpec validation, and `git diff --check` pass.
