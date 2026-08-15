# Source-first release process

This procedure prepares a first public RepoAtlas source release. It is a review checklist, not an automatic command sequence. No step creates a tag, GitHub Release, npm publication, deployment, or remote write without separate explicit authorization.

## Candidate gates

1. Confirm the named MIT copyright holder and preserve [`LICENSE`](../LICENSE), [`NOTICE.md`](../NOTICE.md), and the separate source-attribution guidance.
2. Keep the first candidate at package version `0.1.0`; retain `private: true` because the supported delivery is a source/plugin bundle, not npm publication.
3. Confirm the pinned Harness smoke and README installation recheck are recorded in [`docs/release-checklist.md`](release-checklist.md).
4. Prepare release notes by moving the reviewed user-facing entries from [`CHANGELOG.md`](../CHANGELOG.md) into a versioned release section; do not rewrite history automatically.
5. Use a clean checkout whose `HEAD` equals the reviewed `origin/main` revision and has no active OpenSpec change.
6. Run the read-only candidate check:

   ```bash
   npm run verify:release-preflight
   ```

   `ready` is candidate evidence only. `blocked` must be resolved by a maintainer; it must not be bypassed.

## Authorized release action

After all gates are reviewed, a maintainer may manually create the exact tag and GitHub Release for the reviewed commit, attach the release notes, and record the release URL. The release must continue to describe the source checkout/plugin bundle and must not imply that an npm package or compiled distribution exists.

The tag/release operation is intentionally not implemented in RepoAtlas automation. It must be separately approved and performed using the repository's normal protected-branch and release controls. If a future npm distribution is desired, it requires a new OpenSpec change covering build output, exports, files allowlist, package smoke, and compatibility policy.

## After release

- Mark only the actually completed checklist items and record the exact tag/release commit.
- Update `CHANGELOG.md` and the roadmap without converting an advisory preflight into a release claim.
- Keep the source compatibility pin and support policy aligned with the release notes.
