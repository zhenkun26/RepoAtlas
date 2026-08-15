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
- [ ] Add a reproducible clean-clone and packed-install evaluation.
- [ ] Run a pinned real DeepSeek Harness smoke test and record the compatible revision.
- [ ] Recheck README installation instructions against the actual public Harness release.

## Distribution decision

- [x] Current posture is source-first: load the checkout through `cordis.patch.yml`; `private: true` remains enabled.
- [ ] Decide whether RepoAtlas will publish an npm package or remain a source/plugin bundle.
- [ ] If npm is chosen, define a build output, `exports`, `files` allowlist, package smoke test, and Node/Harness compatibility policy in a new OpenSpec change.
- [ ] If source-first is retained, define the supported checkout/ref and upgrade guidance in a new OpenSpec change.

## First public release

- [ ] Complete and independently close the v2.11 OpenSpec change through its authorized sync/archive workflow.
- [ ] Complete the v2.12 public-release-readiness change and review its provisional license assumption.
- [ ] Create release notes from the changelog and verify the exact commit to be tagged.
- [ ] Create the first tag and GitHub Release only with explicit authorization.
- [ ] Publish or push only through the separately approved release procedure.

## Explicit non-claims

Until the unchecked items above are resolved, RepoAtlas must not claim that it has a public package, a compiled distribution, a real-Harness CI integration, a support SLA, or a completed public release.
