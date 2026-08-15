## ADDED Requirements

### Requirement: The system SHALL list only the calling Harness session's proposals

The `list` action MUST select the registry owned by the current Harness session before applying limits or building summaries. It MUST NOT aggregate managers by process, workspace path, repository identity, or plugin instance.

#### Scenario: Another live session has proposals
- **WHEN** the calling Harness session has no proposals but a sibling session in the same plugin process does
- **THEN** `list` SHALL return an available empty result with total zero and SHALL not reveal sibling proposal ids or counts
