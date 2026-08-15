## Why

v2.12 established the MIT public-project baseline and a source-first Harness loading path, but it did not prove that a clean checkout can be evaluated as a local package artifact or that the public DeepSeek Harness can load the bundle. The next step must resolve those delivery questions without silently turning an ignored local reference checkout into a public compatibility guarantee.

## What changes

- Add a local packed-install smoke that checks the package metadata and tarball contents without publishing or generating `dist/`; because Node's built-in TypeScript stripping rejects `.ts` files directly under `node_modules`, this does not claim ordinary npm consumer imports.
- Record the public DeepSeek Harness repository, ref, exact revision, Node line, pnpm version, and profile in a reviewable compatibility manifest.
- Add a fixed-argument real Harness smoke runner that verifies the pinned checkout, installs the local RepoAtlas bundle into an isolated temporary profile, checks the composed config, and requests Web help without requiring model credentials.
- Add a manual GitHub Actions workflow that checks out the exact public Harness revision, installs its locked dependencies, and runs the smoke; the normal quality CI remains free of external Harness installation.
- Decide and document source-first distribution, supported checkout/ref guidance, upgrade guidance, MIT attribution, and the remaining release blockers.

## Capabilities

### New Capabilities

- `source-distribution-readiness`: bounded local artifact evaluation and pinned external Harness compatibility smoke.

<!-- Existing public-release-readiness documentation is reconciled by this change; its runtime contract is unchanged. -->

## Impact

- Affected files: package scripts, local smoke scripts, compatibility manifest, manual workflow, README, Harness integration, security boundary, release checklist, roadmap, reference guidance, and a new OpenSpec capability spec.
- No `src/` runtime behavior, action schema, lifecycle state, evidence cache, proposal registry, event history, readiness assessment, or Git adapter changes.
- No npm publication, tag, GitHub Release, deployment, remote RepoAtlas operation, or automatic network access in default CI or runtime.
- External Harness installation and clone are limited to the explicitly invoked compatibility workflow; all external failures fail closed as unevaluated readiness evidence.
