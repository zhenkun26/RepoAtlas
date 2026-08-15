## Context

See `proposal.md` for motivation. The current tarball deliberately exports raw TypeScript and the v2.19 live smoke therefore still depends on a source-capable Harness runtime. TypeScript 7 is already locked as a development dependency and supports rewriting relative `.ts` specifiers during emit, so no bundler or new dependency is required.

## Goals / Non-Goals

**Goals:**

- Produce plain Node-compatible ESM plus declarations from all `src/` modules.
- Make package exports and the Harness bundle resolve built files only.
- Prove artifact contents and both public imports from an offline installed tarball.
- Keep generated files disposable and publication separately authorized.

**Non-Goals:**

- Running `npm publish`, changing package visibility, choosing registry access, or creating a new version/tag/release.
- Bundling Node built-ins or changing runtime behavior.
- Shipping tests, examples, OpenSpec changes, or reference checkouts.
- Promising compatibility beyond the existing Node and exact Harness contracts.

## Decisions

### 1. Use TypeScript emit rather than a new bundler

A dedicated build config emits NodeNext ESM, declarations, declaration maps, and source maps to `dist/`, with `rootDir=src` and relative import extension rewriting. This reuses the locked compiler and keeps each module inspectable. A bundler was rejected because it adds dependency, tree-shaking, dynamic-import, and licensing decisions unnecessary for this package.

### 2. Keep generated `dist/` ignored and build before packing

`dist/` is a build output, not source of truth. `prepack` runs the build for ordinary local packing, while verification explicitly builds and then packs with scripts disabled so the artifact is tested exactly as produced. CI starts clean and proves the build is reproducible. Committing `dist/` was rejected because generated drift would create a second review surface.

### 3. Export runtime and declarations conditionally

The root and `./harness` exports use `types` plus `default` conditions into `dist/`; `main` points to the built root. A `files` allowlist includes only `dist`, bundle patch, README, LICENSE, and NOTICE. Raw `src` is excluded so an accidental loader dependency fails package inspection immediately.

### 4. Verify through an offline installed consumer

The artifact smoke builds, runs `npm pack --ignore-scripts --json` into a task-owned directory, validates the file list, installs the tarball with `--offline --ignore-scripts`, and imports both exports with plain Node. It also checks that exported plugin metadata and core functions exist. This is stronger than inspecting filenames but remains local and non-publishing.

### 5. Build RepoAtlas before manual Harness compatibility

The manual workflow installs RepoAtlas's locked development dependencies and runs its build before adding the package to Harness. The Harness workflow remains explicit, pinned, and read-only with respect to repository contents; generated `dist/` is runner-local and ignored.

## Risks / Trade-offs

- [Export shape changes from strings to conditions] → inspect installed metadata and import both public entries.
- [A relative `.ts` import survives emit] → reject `.ts` specifiers in emitted JavaScript during artifact verification.
- [Prepack surprises contributors] → document it, keep build deterministic, and make verification call build explicitly before script-disabled packing.
- [A tarball includes unintended files] → enforce the package allowlist and reject development/source prefixes.
- [Built artifact is mistaken for publication] → retain `private:true` and explicit non-claims in README, changelog, and checklist.

## Migration Plan

1. Add and verify the build config.
2. Switch exports and allowlist atomically with the built-artifact smoke.
3. Update workflows and documentation.
4. Run clean build, offline pack/install/import, compatibility gates, and full repository validation.

Rollback restores source exports and the old diagnostic smoke, removes the build metadata, and deletes ignored `dist/`. No user/session data migration exists, and rollback must not unpublish, move tags, or modify remote release state.
