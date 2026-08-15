# Design: v2.17 public release alignment

## Goals and non-goals

Goals:

- Make the local source repository self-consistent about its release candidate and the immutable `v0.1.0` tag.
- Keep public-facing English and Chinese release-status wording equivalent.
- Provide maintainers with exact, reviewable GitHub About metadata values without performing remote writes.
- Ensure release tooling reports only local evidence and never turns readiness into a release claim.
- Keep the current source-first, `private: true`, no-npm posture explicit.

Non-goals:

- Do not move, delete, recreate, or overwrite `v0.1.0`.
- Do not create a GitHub Release, alter GitHub repository metadata, push, or call a remote API.
- Do not publish to npm, add a compiled `dist/` contract, change package exports, or remove `private: true`.
- Do not add runtime capabilities, network access, arbitrary shell execution, persistence, or cross-session state.
- Do not infer that a local tag or a green preflight means a GitHub Release, npm publication, deployment, or support SLA exists.

## Release candidate policy

The existing `v0.1.0` tag is immutable historical state and remains associated with its exact tagged commit. Because the bilingual README and presentation metadata were added after that tag, the reviewed candidate for the next public release must be a new patch version (recommended: `0.1.1`) on the current reviewed `main` descendant. The implementation must make the version choice explicit in the release documents rather than silently retagging `v0.1.0`.

The change prepares the candidate only. A maintainer separately decides whether to create the new tag and GitHub Release after all gates pass. The candidate remains source-first and is not an npm package.

## Repository presentation metadata

The release documentation should record the following recommended GitHub About values:

- Description: `Safety-first, evidence-backed repository analysis and bounded change-lifecycle plugin for DeepSeek Harness.`
- Homepage: the repository README or the project documentation URL selected by the maintainer.
- Topics: retain `deepseek-harness`, `dsh`, and `dsh-plugin`; add only accurate discovery terms such as `ai-coding`, `code-analysis`, `repository-analysis`, `typescript`, `developer-tools`, and `safety`.

These values are handoff data, not runtime configuration. No workflow or script may update them automatically.

## Documentation and preflight contract

- `CHANGELOG.md` must distinguish unreleased development history, the immutable existing tag, and the next reviewed candidate.
- `README.md` must state the actual current release status in both languages and retain the source-first/no-npm/non-SLA boundaries.
- `docs/release-checklist.md` and `docs/release-process.md` must identify which gates are evidence, which are manual decisions, and which remote actions remain undone.
- `docs/roadmap.md` must record the completed alignment scope without claiming that a GitHub Release or npm publication happened.
- `verify:release-preflight` may inspect local tags and revisions with fixed shell-free Git commands, but it must not access the network or claim to observe GitHub Release state.

## Verification evidence

- OpenSpec strict validation passes with no active-change ambiguity.
- Tests cover the version/tag relation, release-state wording, manual metadata handoff, and fail-closed preflight behavior.
- README bilingual release claims and local links are audited.
- Existing test, lint, typecheck, source-artifact, release-preflight, independent TypeScript, and `git diff --check` gates pass.
- The final handoff records that no remote release, tag mutation, npm publication, or network access was performed.
