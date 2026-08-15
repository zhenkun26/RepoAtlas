# Design: v2.13 source distribution readiness

## Goals and non-goals

Goals:

- Prove that a clean checkout can create and locally install a package artifact while retaining the source-first posture.
- Make the external Harness compatibility target reproducible from a committed SHA and toolchain declaration.
- Keep real Harness execution explicit, isolated, credential-free, and separate from plugin runtime authority.
- Give maintainers an honest handoff: source-first is the current distribution decision, while actual external smoke evidence remains independently recorded.

Non-goals:

- No npm publication, package-name reservation, `dist/` build, release tag, GitHub Release, or support SLA.
- No change to `private: true`, source entry points, `cordis.patch.yml`, or runtime capability declarations.
- No real Harness clone/install in the default pull-request quality workflow.
- No arbitrary repository/ref/command input to the runner; the Harness revision and commands are fixed by repository-controlled files.
- No source workspace mutation, cleanup outside task-owned temporary directories, commit, push, deployment, or user-code upload.

## Decision: source-first remains the supported distribution

RepoAtlas remains loaded from a source checkout through its root `cordis.patch.yml`. `package.json` remains `private: true`; the package tarball is a diagnostic artifact only. The packed-install check validates that the source entry files and metadata survive a local tarball install, but it does not make npm publication, ordinary Node consumer import, or semver support claims.

The source-first upgrade path is:

1. Check out the RepoAtlas repository at the desired reviewed commit.
2. Use Node.js 22+ for RepoAtlas local checks.
3. In a DeepSeek Harness checkout, use the pinned compatibility manifest as the supported smoke target, then run `pnpm dsh plugin --profile web add /absolute/path/to/RepoAtlas`.
4. Re-run the compatibility smoke after changing either repository revision or Harness revision; a changed pin is a new compatibility claim.

The manifest's SHA is authoritative for the smoke. The branch ref is descriptive only and may move.

## Compatibility manifest

Add `reference/harness-compatibility.json` with:

- the public repository URL;
- `ref: master` for human navigation;
- exact public revision `47f943859bef60e4160492346772ded9b24f765a`;
- `profile: web`;
- `node: 24.x`;
- `packageManager: pnpm@11.7.0`.

The ignored `reference/deepseek-harness/` checkout is useful for local investigation but is not compatibility evidence unless its HEAD exactly matches the manifest. A local commit ahead of the public revision must fail the runner rather than being silently accepted.

## Local packed-install smoke

`npm run verify:source-artifact` runs a Node-only repository script that:

- reads and validates the bounded package metadata and bundle patch declaration;
- runs `npm pack --ignore-scripts` into a task-owned temporary directory;
- confirms the tarball contains the source entry points and bundle patch but no required `dist/` path;
- installs that tarball with `npm install --offline --ignore-scripts` into a task-owned temporary consumer;
- inspects the installed package metadata and source exports;
- removes only its own temporary directory.

The command never invokes `npm publish`, never writes the repository, and does not turn package installation into a runtime capability. A plain Node consumer import is intentionally outside this contract: Node's built-in TypeScript stripping rejects `.ts` files under `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`), so the package remains a source/plugin bundle for Harness loaders rather than an npm consumer package. Existing checkout-based tests and the real Harness loader smoke cover executable source integration. The regular CI may run this local-only check because it does not clone or install the external Harness.

## Real Harness smoke

`node scripts/verify-harness-compatibility.mjs` is a development/CI-only runner. It requires `REPO_ATLAS_HARNESS_ROOT` and derives the RepoAtlas root from the current working directory. It:

1. reads the committed manifest;
2. verifies the Harness root is a Git checkout at the exact manifest revision;
3. creates an isolated `DSH_HOME` below the system temporary directory;
4. invokes fixed `pnpm dsh plugin --profile web add <RepoAtlas root>` arguments;
5. invokes fixed `pnpm dsh --profile web --dump-config` and requires the `repo-atlas/harness` bundle to appear;
6. invokes fixed `pnpm dsh web --help` and requires a successful help exit;
7. removes only the task-owned temporary `DSH_HOME`.

The runner uses `execFileSync` with `shell: false`, bounded output capture, and no credentials. It does not accept a revision, command, profile, package specifier, or arbitrary working directory from the caller. The workflow installs the pinned Harness checkout with its lockfile before invoking the runner; runtime plugin code never calls this runner.

## Workflow and evidence

Add `.github/workflows/harness-compatibility.yml` with `workflow_dispatch` only, `contents: read`, Node 24.x, pnpm 11.7.0, checkout of the exact manifest SHA, `pnpm install --frozen-lockfile`, and the smoke command. The workflow must fail if the checkout, install, config composition, or help probe fails. A workflow definition is not a completed smoke result; the release checklist remains unchecked until a successful run is reviewed.

## Invariants

1. `package.json` remains `private: true`, license `MIT`, source-entry based, and without a `dist/` publication contract.
2. No change in this capability adds runtime network, arbitrary Shell, dependency installation, persistence, cross-session state, source workspace writes, remote Git, commit, push, or deployment authority.
3. The real smoke accepts only the exact public Harness revision in the committed manifest; local ahead/diverged checkouts fail closed.
4. All subprocesses use fixed executable/argument vectors and `shell: false`; temporary filesystem effects are confined to task-owned directories.
5. External smoke failure, skipped execution, or unavailable credentials never becomes a readiness success, release authorization, or public compatibility claim.
6. The package artifact smoke does not imply npm publication, compiled distribution, or support for arbitrary consumer versions.
7. MIT permission and retained notice requirements remain distinct from the project-level request to identify RepoAtlas / 代码星图 and link the source repository.

## Failure modes and recovery

- Missing manifest, malformed metadata, wrong Harness revision, missing `pnpm`, missing dependencies, nonzero `dsh` command, or unexpected output: fail with a bounded diagnostic and no success claim.
- Abort or timeout: leave the source checkout untouched and remove only the runner-owned temporary profile if its ownership is known; do not attempt recovery in the Harness checkout.
- Pack/install or metadata failure: keep `private: true` and report the artifact contract as unverified; do not fix by publishing, changing exports, or generating `dist/` automatically.
- External network/action failure in the manual workflow: mark the smoke unavailable/failed; do not skip the step or promote local fake-context tests to real-Harness evidence.

Rollback is file-level: remove the v2.13 scripts, manifest, workflow, documentation, and active OpenSpec change. No runtime migration or persistent state cleanup is required.

## Verification evidence

- OpenSpec strict validation passes with one active v2.13 change and the new source-distribution spec.
- Package artifact smoke passes on Node 22 and 24 in default CI without external network access beyond the existing dependency install.
- The manual workflow is structurally reviewed for exact revision, explicit trigger, read-only repository permission, and no credentials.
- When externally run, the Harness smoke reports exact revision, config composition, and Web help success; until then the checklist records it as pending.
- Existing tests, safety lint, typechecks, and `git diff --check` remain green; no `src/` file is changed.
