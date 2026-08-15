# Source-first release process

This procedure prepares and records a RepoAtlas source-first release. It is a review checklist, not an automatic command sequence. No step creates a tag, GitHub Release, npm publication, deployment, or remote write without separate explicit authorization.

## Candidate gates

1. Confirm the named MIT copyright holder and preserve [`LICENSE`](../LICENSE), [`NOTICE.md`](../NOTICE.md), and the separate source-attribution guidance.
2. Treat the existing `v0.1.0` tag as immutable historical state. It points to `455dbb61d5cabe032e3497ba4d9eeb9c39584662`; do not move, delete, recreate, or overwrite it.
3. Retain `private: true`. The current checkout can build a local package artifact, but npm publication and any next version/tag remain separate maintainer decisions.
4. Confirm the pinned Harness smoke and README installation recheck are recorded in [`docs/release-checklist.md`](release-checklist.md).
5. Prepare release notes by reviewing the `[0.1.1] - 2026-08-15` section in [`CHANGELOG.md`](../CHANGELOG.md); do not rewrite the immutable `v0.1.0` history automatically.
6. Use a clean checkout whose `HEAD` equals the reviewed `origin/main` revision and has no active OpenSpec change.
7. Run the read-only candidate check:

   ```bash
   npm run verify:release-preflight
   ```

   `ready` is candidate evidence only. `blocked` must be resolved by a maintainer; it must not be bypassed.

## Repository page handoff

The following values are recommended manual GitHub About metadata. Applying them is a separate authorized GitHub operation; RepoAtlas tooling and workflows do not update them:

- Description: `Safety-first, evidence-backed repository analysis and bounded change-lifecycle plugin for DeepSeek Harness.`
- Homepage: `https://github.com/zhenkun26/RepoAtlas#readme` or another maintainer-selected documentation URL.
- Topics: `deepseek-harness`, `dsh`, `dsh-plugin`, `ai-coding`, `code-analysis`, `repository-analysis`, `typescript`, `developer-tools`, `safety`.

These values are presentation metadata only. They do not change the source-first distribution contract or authorize a tag, GitHub Release, npm publication, or deployment.

## Authorized release action

For v0.1.1, the maintainer manually created the exact tag and GitHub Release for reviewed commit `3eb5c0c8c48373dd19a6e0317de8ffb26f0064bc`, attached source-first release notes, and recorded <https://github.com/zhenkun26/RepoAtlas/releases/tag/v0.1.1>. The release describes the source checkout/plugin bundle and does not imply an npm package or compiled distribution. The existing `v0.1.0` tag was not reused.

The tag/release operation is intentionally not implemented in RepoAtlas automation. It must be separately approved and performed using the repository's normal protected-branch and release controls. v2.20 covers build output, exports, files allowlist, package smoke, and compatibility policy; that is technical artifact readiness only. Any future npm publication still requires independently reviewed version, registry, provenance, authentication, and release authorization work.

## After release

- Mark only the actually completed checklist items and record the exact tag/release commit.
- Update `CHANGELOG.md` and the roadmap after release without converting an advisory preflight into the release action itself.
- Keep the source compatibility pin and support policy aligned with the release notes.

The v0.1.1 release action is complete. Future releases must repeat the candidate gates and require separate authorization; the preflight is intended to run before a candidate tag exists and will remain blocked once the candidate tag is present.
