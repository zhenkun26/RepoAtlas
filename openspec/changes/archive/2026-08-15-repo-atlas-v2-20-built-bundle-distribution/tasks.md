## 1. OpenSpec and release boundary

- [x] 1.1 Strictly validate the new built-distribution capability and complete modified distribution/release requirements
- [x] 1.2 Preserve `private:true`, MIT/provenance files, exact Harness pin, and no publish/tag/release/push/deploy authority

## 2. Deterministic build and package metadata

- [x] 2.1 Add an ignored deterministic ESM/declaration build under `dist/` with relative TypeScript extension rewriting
- [x] 2.2 Point root and Harness runtime/type exports to built files and add the minimal package `files` allowlist
- [x] 2.3 Add build/prepack scripts without new dependencies or install-time consumer build requirements
- [x] 2.4 Confirm the dependency lock remains valid without dependency changes and update the default CI quality path for the built package contract

## 3. Built artifact and Harness verification

- [x] 3.1 Replace source-artifact assumptions with build/pack/file-allowlist/offline-install verification in task-owned temporary directories
- [x] 3.2 Import both installed public entries with plain Node and reject raw source or emitted `.ts` import leakage
- [x] 3.3 Build RepoAtlas before the explicit pinned Harness workflow adds the local bundle
- [x] 3.4 Keep artifact and compatibility verification non-publishing, offline where declared, bounded, and fail-closed

## 4. Documentation and final evidence

- [x] 4.1 Update bilingual README, security boundary, Harness integration, roadmap, changelog, support/release process, and checklist wording
- [x] 4.2 Run clean build, built-artifact smoke, focused/full tests, lint, typecheck, strict OpenSpec validation, package inspection, and `git diff --check`
- [x] 4.3 Reconcile tasks only after evidence passes; do not archive, commit, push, publish, tag, release, deploy, or install new dependencies
