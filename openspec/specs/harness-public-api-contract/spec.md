# harness-public-api-contract Specification

## Purpose
Define reproducible compile-time and live-boot evidence that RepoAtlas conforms to the public DeepSeek Harness plugin contract at one exact reviewed revision.
## Requirements
### Requirement: The adapter SHALL be checked against official public Harness types

The repository MUST provide a compile-time contract check that resolves the public Harness tool, execution, session, Cordis context, approval, Goal, sandbox-policy, sandbox, and subprocess types from the exact compatibility checkout. RepoAtlas tool definitions and plugin apply shape MUST be assignable to those exports without relying only on locally handwritten interfaces.

#### Scenario: The official API still matches
- **WHEN** the contract check runs against the exact manifest revision with built Harness type declarations available
- **THEN** RepoAtlas plugin registration, tool execution, session access, cancellation, and service-adapter shapes SHALL typecheck successfully

#### Scenario: An official public shape drifts
- **WHEN** a required exported type, method argument, or result shape is no longer compatible
- **THEN** the contract check SHALL fail and SHALL NOT silently accept the local mirror as evidence

### Requirement: Compatibility evidence SHALL use the public revision only

The manifest's exact public revision MUST remain authoritative for both compile and boot checks. A branch name, locally authored descendant, dirty checkout, or different revision MUST NOT be accepted as equivalent evidence.

#### Scenario: A local checkout is ahead of the pin
- **WHEN** the supplied Harness checkout HEAD differs from the exact manifest revision
- **THEN** contract and boot validation SHALL fail before loading RepoAtlas and SHALL identify revision drift with bounded diagnostics

### Requirement: Live boot evidence SHALL prove plugin activation

The explicit compatibility smoke MUST start the composed Harness Web profile with RepoAtlas installed, wait for the post-settlement readiness signal, probe the live loopback endpoint, and terminate only the process it started. Config composition or `--help` output alone MUST NOT count as plugin activation evidence.

#### Scenario: The plugin boots in the pinned Web profile
- **WHEN** the exact checkout has its locked dependencies and the explicit smoke runs
- **THEN** the profile SHALL compose `repo-atlas/harness`, reach the Harness Web readiness signal, answer a bounded loopback probe, and exit after controlled termination

#### Scenario: Plugin loading fails or never settles
- **WHEN** the plugin has an import, registration, schema, injection, or activation failure, or no readiness signal appears before the deadline
- **THEN** the smoke SHALL terminate its owned process, fail with bounded output, and SHALL NOT claim compatibility
