## Why

The first public-release CI run failed on both Node.js 22 and 24 because `scripts/lint.mjs` invoked `rg --files src`, but GitHub-hosted runners do not guarantee that the ripgrep executable is installed. The repository already declares Node.js as its toolchain and does not declare `rg` as a dependency.

## What Changes

- Replace the `rg` subprocess used to enumerate `src/` files with a recursive Node.js standard-library traversal.
- Preserve deterministic file collection, the existing source-only scope, forbidden side-effect token checks, and the existing pass/fail output contract.
- Add a focused OpenSpec boundary and regression checks for a clean runner without `rg`.

## Capabilities

### New Capabilities

- `ci-lint-portability`: the repository safety lint runs from the locked Node.js toolchain without relying on an undeclared runner executable.

## Non-Goals

- Do not change RepoAtlas runtime permissions or safety policy.
- Do not add a dependency or install `rg` in CI.
- Do not weaken forbidden-token matching, source scope, or failure behavior.
- Do not modify the remote workflow outside the repository commit that contains this fix.

## Impact

- Affected file: `scripts/lint.mjs`.
- Affected validation: `npm run lint` and the existing CI quality job.
- No new runtime dependency, network capability, persistence, or OpenSpec main-spec behavior beyond this tooling correction.
