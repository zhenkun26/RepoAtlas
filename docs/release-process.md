# Source-first release process

This procedure prepares the next RepoAtlas source-first release candidate. It is a review checklist, not an automatic command sequence. No step creates a tag, GitHub Release, npm publication, deployment, or remote write without separate explicit authorization.

## Candidate gates

1. Confirm the named MIT copyright holder and preserve [`LICENSE`](../LICENSE), [`NOTICE.md`](../NOTICE.md), and the separate source-attribution guidance.
2. Treat the existing `v0.1.0` tag as immutable historical state. It points to `455dbb61d5cabe032e3497ba4d9eeb9c39584662`; do not move, delete, recreate, or overwrite it.
3. Use package version `0.1.1` for the next reviewed candidate and retain `private: true` because the supported delivery is a source/plugin bundle, not npm publication.
4. Confirm the pinned Harness smoke and README installation recheck are recorded in [`docs/release-checklist.md`](release-checklist.md).
5. Prepare release notes by reviewing the `[0.1.1] - Unreleased candidate` section in [`CHANGELOG.md`](../CHANGELOG.md); do not rewrite the immutable `v0.1.0` history automatically.
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

After all gates are reviewed, a maintainer may manually create the exact `v0.1.1` tag and GitHub Release for the reviewed commit, attach the release notes, and record the release URL. The release must continue to describe the source checkout/plugin bundle and must not imply that an npm package or compiled distribution exists. The exact commit is rechecked immediately before the tag operation; the existing `v0.1.0` tag is never reused for this candidate.

The tag/release operation is intentionally not implemented in RepoAtlas automation. It must be separately approved and performed using the repository's normal protected-branch and release controls. If a future npm distribution is desired, it requires a new OpenSpec change covering build output, exports, files allowlist, package smoke, and compatibility policy.

## After release

- Mark only the actually completed checklist items and record the exact tag/release commit.
- Update `CHANGELOG.md` and the roadmap without converting an advisory preflight into a release claim.
- Keep the source compatibility pin and support policy aligned with the release notes.
