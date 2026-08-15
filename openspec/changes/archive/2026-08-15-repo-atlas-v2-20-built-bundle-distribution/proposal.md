## Why

RepoAtlas's tarball exports raw `.ts`, which works only when the consuming Harness source runtime supplies a TypeScript loader and fails for built CLI/package installations. A reproducible compiled artifact is required before npm publication can even be evaluated honestly.

## What Changes

- Add a deterministic TypeScript build that emits ESM JavaScript and declarations under `dist/` with rewritten relative extensions.
- Change package `main` and exports to built root and Harness entry points, and add a minimal package `files` allowlist.
- Replace the source-artifact smoke with a built-artifact pack/install/import smoke that rejects raw source leakage and missing declarations.
- Build RepoAtlas before the manual pinned Harness compatibility workflow loads the local package.
- Keep `private: true`; implementation creates no npm publication, tag, GitHub Release, push, deployment, or committed `dist/` requirement.
- Keep the MIT notice/disclaimer and separate provenance request in the packed artifact.

## Capabilities

### New Capabilities

- `built-bundle-distribution`: Defines deterministic compiled package contents and offline packed-consumer verification.

### Modified Capabilities

- `source-distribution-readiness`: Replaces raw-source tarball acceptance with a built bundle while retaining exact-pin external Harness validation and explicit manual execution.
- `public-release-readiness`: Changes package metadata from source entry points to built exports without enabling npm publication.

## Impact

Affected areas include package metadata and lockfile, build configuration, artifact verification, default/manual workflows, `.gitignore`, README/release/support/security documentation, and distribution tests. No new runtime dependency or external write authority is introduced.
