## MODIFIED Requirements

### Requirement: The repository SHALL declare a source-first distribution posture

The repository MUST declare an explicit license, package license metadata, supported Node.js baseline, built ESM/declaration entry points, an explicit package `files` allowlist, and the fact that npm publication is not enabled. README and release checklist MUST provide a reproducible local built-artifact validation path and MUST NOT describe an npm publication or new release tag that does not exist.

#### Scenario: A clean checkout can discover the supported local path
- **WHEN** a contributor reads the root README and package metadata
- **THEN** they SHALL find Node.js 22+, `npm ci`, build/test/lint/typecheck commands, strict OpenSpec validation, the built-artifact verification, and the Harness bundle installation path

#### Scenario: The repository does not imply an npm release
- **WHEN** a contributor inspects `package.json` and the release checklist
- **THEN** `private` SHALL remain `true`, exports SHALL point to allowlisted `dist/` files, and npm publication SHALL remain a separately authorized follow-up rather than a completed capability
