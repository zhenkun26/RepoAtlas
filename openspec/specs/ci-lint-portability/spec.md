# ci-lint-portability Specification

## Purpose
Define the portability contract for the repository's safety lint command on clean CI runners.
## Requirements
### Requirement: The safety lint SHALL enumerate source files using the declared Node.js toolchain

`npm run lint` MUST recursively scan regular files below `src/` without requiring `rg` or another undeclared executable. It MUST preserve deterministic file ordering, the existing forbidden side-effect token policy, the adapter/reporting exceptions, and the existing nonzero failure behavior.

#### Scenario: Clean runner without ripgrep

- **WHEN** a clean Node.js 22 or 24 runner executes `npm ci` followed by `npm run lint` and `rg` is unavailable
- **THEN** the lint command SHALL complete successfully for the current source tree and SHALL report the number of scanned files

#### Scenario: Forbidden source token still fails the lint

- **WHEN** a scanned source file contains a forbidden side-effect token outside the existing exceptions
- **THEN** the lint command SHALL retain its failure status and report the violating file

#### Scenario: Source scope remains bounded

- **WHEN** the repository contains files outside `src/`
- **THEN** the lint command SHALL not scan them as source lint inputs
