## ADDED Requirements

### Requirement: The system SHALL bind controlled actions to the calling session workspace

The controlled-action adapter MUST derive its execution root from the current Harness session cwd for every call and MUST require the Harness sandbox policy to resolve the same root. Plugin startup cwd and model-supplied values MUST NOT select or widen the execution root.

#### Scenario: Harness runs outside the user's workspace
- **WHEN** the Harness process cwd differs from the calling session cwd and an enabled bounded recipe is approved
- **THEN** path validation, sandbox policy, and subprocess cwd SHALL use the calling session workspace and SHALL not use the Harness checkout

#### Scenario: Sandbox policy disagrees with the session root
- **WHEN** the resolved sandbox workspace differs from the canonical calling session cwd
- **THEN** the action SHALL fail closed before subprocess spawn
