# Design: v2.15 open-source showcase

## Goals and non-goals

Goals:

- Make the first README screen useful to an open-source visitor, maintainer, and evaluator.
- State the project value proposition in concise English and Chinese.
- Show the supported source-first Harness installation path before the lower-level API details.
- Preserve an evidence-backed description of current capabilities, compatibility, safety boundaries, and distribution limits.
- Make license, attribution, contribution, and security routes easy to find.

Non-goals:

- No runtime feature, action name, output schema, state model, or permission change.
- No compiled distribution, npm publication, npm consumer import contract, or package build.
- No claim that a GitHub Release, npm package, SLA, or arbitrary DeepSeek Harness branch is supported.
- No generated statistics, popularity claims, performance benchmarks, or badges that imply unverified external state.
- No change to the source-first installation command or pinned compatibility revision.

## Audience and narrative order

The README follows this order:

1. one-line project description and verified repository badges;
2. why RepoAtlas and what it produces;
3. capability groups for repository understanding, change lifecycle, and Harness integration;
4. quick start using a source checkout and the public Harness plugin loader;
5. safety model and explicit non-goals;
6. compatibility and distribution status;
7. development verification commands;
8. license, attribution, contribution, security, roadmap, and detailed documentation links.

## Wording constraints

- “Read-only by default” refers to the core analysis path; explicitly enabled controlled actions remain approval- and sandbox-gated.
- Session-only means evidence cache, proposal registry, lifecycle history, and readiness observations do not persist or cross sessions.
- A proposal, preflight, commit, or landing relation must not be described as a patch generated, commit applied, or landing completed.
- The README must say that the supported distribution is a source/plugin bundle loaded through `cordis.patch.yml`.
- The README must retain the distinction between MIT notice/disclaimer requirements and the project's separate provenance request.

## Metadata contract

`package.json.description` SHALL be a concise English description that identifies RepoAtlas as a safety-first, evidence-backed DeepSeek Harness repository-analysis and bounded change-lifecycle plugin, while preserving source-first/session-only boundaries. It SHALL NOT say that RepoAtlas is published to npm or compiled for ordinary Node consumer imports.

## Verification evidence

- OpenSpec strict validation passes for the new change.
- README links, commands, version claims, compatibility pin, and distribution statements are checked against the repository.
- `package.json` remains valid JSON and keeps `private: true`, `MIT`, source exports, and `dsh.bundle` unchanged in meaning.
- Existing tests, lint, typecheck, source artifact, release preflight, and `git diff --check` pass.
