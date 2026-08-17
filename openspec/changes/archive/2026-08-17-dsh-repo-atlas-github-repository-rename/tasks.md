## 1. OpenSpec and migration preflight

- [x] 1.1 Validate the proposal, design, and identity delta with strict OpenSpec checks.
- [x] 1.2 Confirm the clean `main` checkout, current GitHub owner/name, target-name availability, and required rename invariants.

## 2. GitHub and local identity migration

- [x] 2.1 Rename `zhenkun26/RepoAtlas` to `zhenkun26/dsh-repo-atlas` through the authenticated GitHub CLI.
- [x] 2.2 Update current package metadata, README wording and links, governance/release documentation, workflow links, and verification assertions to the new canonical URL.
- [x] 2.3 Update and verify the local `origin` remote URL without changing branches, history, tags, or releases.

## 3. Verification and handoff

- [x] 3.1 Verify the renamed GitHub repository identity, preserved default branch/release state, local remote, and absence of stale current repository URLs.
- [x] 3.2 Run tests, typecheck, lint, build, built-artifact verification, release-preflight verification, strict OpenSpec validation, and `git diff --check`.
- [x] 3.3 Mark the change complete, archive it into the dated OpenSpec archive, commit the local reference migration, and push the normal branch update.
