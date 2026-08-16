## MODIFIED Requirements

### Requirement: The adapter SHALL be checked against official public Harness types

The repository MUST provide a compile-time contract check that resolves the public Harness tool, execution, session, Cordis context, approval, Goal, sandbox-policy, sandbox, and subprocess types from the exact compatibility checkout. RepoAtlas tool definitions and plugin apply shape MUST be assignable to those exports without relying only on locally handwritten interfaces. The local sandbox-policy request facade MUST model the complete official `SandboxMode` vocabulary for structural compatibility, while RepoAtlas runtime adapters MUST continue to reject any resolved mode other than `read-only` or `workspace-write` before sandbox confinement or subprocess execution.

#### Scenario: The official API still matches
- **WHEN** the contract check runs against the exact manifest revision with built Harness type declarations available
- **THEN** RepoAtlas plugin registration, tool execution, session access, cancellation, and service-adapter shapes SHALL typecheck successfully

#### Scenario: The official policy vocabulary includes an unconfined mode
- **WHEN** the official sandbox-policy request accepts or resolves `danger-full-access`
- **THEN** the structural facade SHALL remain type-compatible, but RepoAtlas controlled execution SHALL fail closed before sandbox confinement or subprocess execution

#### Scenario: An official public shape drifts
- **WHEN** a required exported type, method argument, or result shape is no longer compatible
- **THEN** the contract check SHALL fail and SHALL NOT silently accept the local mirror as evidence
