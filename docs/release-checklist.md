# Public release checklist

This checklist describes release readiness; it is not an instruction to publish, push, deploy, or change a user's workspace. Each item needs its own review evidence and authorization.

## Repository baseline

- [x] Root license is present and `package.json` declares the same license.
- [x] Contribution, conduct, security, and changelog documents are present.
- [x] README describes the current v2 lifecycle, source-first Harness loading, safety boundaries, and non-goals.
- [x] CI covers Node.js 22 and 24 with `npm ci`, tests, lint, typecheck, strict OpenSpec validation, and `git diff --check`.
- [x] Project owner approved MIT as the license choice; preserve the MIT notice and disclaimer.
- [x] Public references and integrations are required to identify RepoAtlas / 代码星图 and link the source repository; see [NOTICE](../NOTICE.md).
- [ ] Confirm the named copyright holder before the first public release.

## Runtime and integration evidence

- [x] Local core API and plugin imports remain covered by the existing test suite.
- [x] Fake-context Harness registration and action contract tests remain green.
- [x] Add a reproducible clean-checkout and packed-install evaluation: default CI starts from a clean checkout and runs `npm run verify:source-artifact` on Node.js 22/24.
- [x] Run a pinned real DeepSeek Harness smoke test and record the compatible revision: `47f943859bef60e4160492346772ded9b24f765a` with Node 24.x and pnpm 11.7.0.
- [x] Recheck README installation instructions against the actual public Harness release at the pinned revision.

## Distribution decision

- [x] Current posture is source-first: load the checkout through `cordis.patch.yml`; `private: true` remains enabled.
- [x] v2.13 decision: remain a source/plugin bundle; local packed-install is diagnostic and does not enable npm publication or ordinary Node consumer imports.
- [ ] If npm is chosen, define a build output, `exports`, `files` allowlist, package smoke test, and Node/Harness compatibility policy in a new OpenSpec change.
- [x] If source-first is retained, define the supported checkout/ref and upgrade guidance in the v2.13 OpenSpec change and `reference/harness-compatibility.json`.

## First public release

- [x] Complete and independently close the v2.11 OpenSpec change through its authorized sync/archive workflow.
- [x] Complete the v2.12 public-release-readiness change and preserve the MIT attribution/provenance guidance; named copyright-holder confirmation remains pending.
- [x] Document the proposed source-first support policy and manual release procedure; adoption remains a separate maintainer decision.
- [ ] Run `npm run verify:release-preflight` successfully on the final reviewed candidate.
- [x] Create release notes from the changelog; the exact commit to be tagged is rechecked immediately before tagging.
- [ ] Create the first tag and GitHub Release only with explicit authorization.
- [ ] Publish or push only through the separately approved release procedure.

## Explicit non-claims

Until the unchecked items above are resolved, RepoAtlas must not claim that it has a public npm package, a compiled distribution, an adopted support SLA, or a completed public release. The pinned Harness smoke is complete evidence, while the preflight remains candidate evidence and does not create release state.
