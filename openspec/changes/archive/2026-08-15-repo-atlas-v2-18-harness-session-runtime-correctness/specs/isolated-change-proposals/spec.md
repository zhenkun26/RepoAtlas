## ADDED Requirements

### Requirement: The system SHALL bind proposal ownership to one live Harness session

The proposal manager used for analysis registration and every proposal lifecycle action MUST belong to the exact calling Harness session. An internal analysis session id, proposal id, patch id, commit id, or landing id MUST be treated as unknown outside that owner session even when another session uses the same workspace.

#### Scenario: Another session submits an owned lifecycle id
- **WHEN** a sibling Harness session submits any lifecycle id created by the owner session
- **THEN** the operation SHALL fail closed before adapter access, approval, Git, sandbox, subprocess, or mutation and SHALL not disclose owner-session details

#### Scenario: Owner session continues its lifecycle
- **WHEN** the original Harness session submits an id from its own in-memory registry
- **THEN** existing digest, expiry, Goal, approval, identity, and postcondition gates SHALL continue to apply within that session
