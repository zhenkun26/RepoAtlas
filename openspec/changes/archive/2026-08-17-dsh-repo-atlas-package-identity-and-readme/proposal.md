## Why

The current package name `repo-atlas` describes the product but does not tell a new user that this is a DeepSeek Harness plugin. The README also assumes too much familiarity with Harness, bundle patches, and lifecycle terminology before explaining the basic use case.

## What Changes

- Rename the public npm/package identity and Harness bundle display identity to `dsh-repo-atlas` and `dsh-repo-atlas/harness`.
- Keep the RepoAtlas product name, repository URL, internal TypeScript symbols, and existing tool names such as `repo_atlas_analyze` stable.
- Update package metadata, lockfile metadata, bundle patch metadata, built-artifact checks, compatibility checks, tests, and user-facing integration documentation.
- Rewrite the bilingual README so a first-time visitor can understand the problem, capabilities, safety boundaries, quick start, compatibility posture, and license/attribution guidance quickly.

## Capabilities

### New Capabilities

- `public-plugin-identity`: define the DSH-prefixed package and Harness bundle identity while preserving existing tool API names.

### Modified Capabilities

- `built-bundle-distribution`: packed imports and artifact checks use the renamed package identity.
- `harness-public-api-contract`: live activation evidence uses the renamed Harness bundle.
- `source-distribution-readiness`: source-first installation and compatibility checks use the renamed bundle.
- `bilingual-readme`: bilingual onboarding and governance guidance describe the renamed package and bundle.

## Impact

Affected areas are package metadata, the Harness adapter display name, bundle patch metadata, local and compatibility verification, current integration documentation, the public README, and OpenSpec deltas. Existing runtime permissions, session-only state boundaries, controlled-action approval gates, tool names, npm publication status, and GitHub repository identity remain unchanged.
