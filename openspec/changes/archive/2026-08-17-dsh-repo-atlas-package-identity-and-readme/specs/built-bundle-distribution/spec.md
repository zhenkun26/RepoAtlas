# built-bundle-distribution Specification Delta

## MODIFIED Requirements

### Requirement: The package SHALL expose compiled ESM and declarations

The package MUST build every public root and Harness entry into ESM JavaScript under `dist/`, MUST emit corresponding TypeScript declarations, and MUST rewrite relative TypeScript import extensions to executable JavaScript extensions. Package exports MUST resolve runtime and type consumers to those built files under the `dsh-repo-atlas` package identity.

#### Scenario: A consumer imports the packed package

- **WHEN** a task-owned offline consumer installs the locally packed artifact and imports both `dsh-repo-atlas` and `dsh-repo-atlas/harness` using plain supported Node.js
- **THEN** both imports SHALL resolve from `dist/` without `tsx`, `--experimental-strip-types`, a Harness source checkout, or install-time build scripts
