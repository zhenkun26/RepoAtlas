## 1. OpenSpec and public identity

- [x] 1.1 Validate the proposal, design, and specification deltas for the package identity and README boundary.
- [x] 1.2 Update package metadata, lockfile metadata, Harness plugin export name, bundle patch id/name, and current integration references to `dsh-repo-atlas`.
- [x] 1.3 Preserve existing `repo_atlas_*` tool names and add focused assertions documenting that compatibility boundary.

## 2. README and user-facing documentation

- [x] 2.1 Rewrite `README.md` with a plain-language bilingual overview, quick start, workflow, safety model, compatibility, source-first distribution, development, governance, and attribution guidance.
- [x] 2.2 Update current Harness integration and release/support references to distinguish the RepoAtlas product brand from the `dsh-repo-atlas` package identity.

## 3. Verification

- [x] 3.1 Run typecheck, tests, lint, build, built-artifact verification, and strict OpenSpec validation.
- [ ] 3.2 Run or trigger the exact-pin Harness compatibility smoke when the renamed bundle is available, and record the result without claiming broader compatibility. <!-- BLOCKED 2026-08-17: the local reference checkout is not the manifest pin, and the renamed changes are not yet pushed for a manual workflow run. -->
