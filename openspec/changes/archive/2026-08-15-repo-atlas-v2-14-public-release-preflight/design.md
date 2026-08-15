# Design: v2.14 public release preflight

## Goals and non-goals

Goals:

- Make the source-first first-release process understandable to a maintainer and downstream user.
- Make the supported baseline explicit: MIT with retained notice/disclaimer, Node.js 22+, pinned Harness smoke revision, and no npm consumer package.
- Detect release-candidate blockers before any manual tag or GitHub Release action.
- Keep the preflight deterministic, local, bounded, and fail closed.

Non-goals:

- No tag creation, GitHub Release creation, `git push`, npm publish, package build, deployment, or remote API call.
- No automatic modification of `CHANGELOG.md`, version metadata, release notes, or checklist markers.
- No Git reset, checkout, clean, merge, commit, or worktree cleanup.
- No new runtime permission, session persistence, network capability, or external service integration.

## Release decision

RepoAtlas remains source-first for the first public release. The candidate package version is `0.1.0`, but `package.json` remains `private: true` and no npm publication is part of this change. The supported user path is a reviewed RepoAtlas source checkout loaded through `cordis.patch.yml` in DeepSeek Harness.

The proposed support baseline is:

- Node.js 22+ for RepoAtlas local checks; CI covers Node.js 22 and 24.
- Real Harness compatibility is proven only for the exact revision in `reference/harness-compatibility.json`, currently `47f943859bef60e4160492346772ded9b24f765a`, with Node 24.x and pnpm 11.7.0.
- The source/plugin bundle is supported on a best-effort basis after a release; arbitrary Harness branches, forks, Node <22, and ordinary npm consumer imports of raw `.ts` entry points are outside the contract.
- Security reports use the private channel in `SECURITY.md`; there is no automatic response-time or support SLA until a maintainer explicitly adopts one.
- MIT permits use, modification, and redistribution when the notice and disclaimer are retained. Public references should identify RepoAtlas / 代码星图 and link the canonical source repository; this provenance request is separate from the MIT legal terms.

## Preflight contract

`npm run verify:release-preflight` runs a Node standard-library script with fixed local Git argv and no shell. It observes:

1. `package.json` remains MIT, `private: true`, source-entry based, and bundle-patch based;
2. `LICENSE`, `NOTICE.md`, `docs/support-policy.md`, and `docs/release-process.md` exist and retain the canonical attribution contract;
3. the release checklist records the pinned real Harness smoke and README recheck;
4. there are no active OpenSpec change directories outside `openspec/changes/archive`;
5. the worktree has no tracked or untracked changes;
6. local `HEAD` equals local `origin/main`, when that tracking ref is available;
7. the checklist's human blockers, including copyright-holder confirmation and release-note creation, are explicitly checked.

The script prints a bounded JSON observation:

```json
{
  "status": "blocked",
  "revision": "<sha>",
  "branch": "main",
  "checks": [{"id": "workspace-clean", "status": "pass"}],
  "blockers": ["copyright-holder-unconfirmed", "release-notes-pending"],
  "tagCreated": false,
  "releaseCreated": false,
  "publishPerformed": false,
  "networkAccessed": false
}
```

`ready` means only that the observed local candidate satisfies the declared checks. `blocked` is the safe default for missing documents, dirty/drifted state, active OpenSpec work, unconfirmed human gates, or inspection errors. Neither result creates authority for a tag, release, publish, or push.

## Manual workflow boundary

`.github/workflows/release-preflight.yml` is `workflow_dispatch` only with `contents: read`. It checks out the repository, installs the locked Node dependencies, runs the normal quality checks and source artifact smoke, then runs `verify:release-preflight`. It has no `gh release`, `git tag`, `git push`, npm publish, credential, deployment, or remote API step. A blocked preflight fails the workflow and must be resolved by a maintainer rather than bypassed.

## Invariants

1. `private: true`, MIT metadata, `LICENSE`, `NOTICE.md`, source exports, and `cordis.patch.yml` remain unchanged in meaning.
2. Preflight uses only fixed local filesystem reads and fixed read-only Git commands with `shell:false`; it does not access network or invoke release tooling.
3. Dirty worktree, active OpenSpec change, missing `origin/main`, revision drift, missing support/release docs, and unchecked human gates cannot produce `ready`.
4. The result always states `tagCreated: false`, `releaseCreated: false`, `publishPerformed: false`, and `networkAccessed: false`.
5. Preflight output contains no absolute path, patch text, secret, command string, or approval data.
6. A successful preflight is advisory candidate evidence, never release authorization or proof that a public release exists.

## Failure modes and recovery

- Malformed package/checklist/manifest or missing document: return `blocked` with a bounded blocker code; do not repair automatically.
- Dirty or remote-drifted candidate: return `blocked`; do not reset, clean, fetch, merge, commit, or push.
- Active OpenSpec work: return `blocked`; do not archive or modify the change from the script.
- Missing local `origin/main`: return `blocked`; do not fetch or access the network.
- Human release gates unchecked: return `blocked`; require explicit maintainer edits and review.
- Workflow dependency/action failure: fail the workflow; do not skip preflight or promote earlier evidence.

Rollback is file-level: remove the v2.14 documents, script, workflow, package script, and OpenSpec artifacts. No runtime data or external release state is created.

## Verification evidence

- Focused preflight run on the current candidate returns `blocked` for the known unresolved human gates and never performs release side effects.
- A temporary dirty/active-change fixture or equivalent controlled observation proves fail-closed blocker behavior without touching the RepoAtlas source checkout.
- Existing tests, lint, native/independent typechecks, source artifact smoke, strict OpenSpec validation, and `git diff --check` pass.
- Manual workflow YAML and script review prove no tag/release/publish/push/network path.
