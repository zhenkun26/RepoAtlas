## Purpose

Bind every Harness-facing RepoAtlas operation to the exact calling agent session, its immutable workspace, and its cooperative cancellation channel without process-directory fallback or cross-session state sharing.

## ADDED Requirements

### Requirement: The system SHALL resolve the workspace from each Harness invocation

Every Harness-facing RepoAtlas tool call that reads or acts on a workspace MUST derive its root from the current `execution.agent.session.header.cwd`. A normal agent call MUST NOT use the plugin mount directory or `process.cwd()` as its workspace. An explicitly configured root MAY restrict an invocation, but MUST NOT replace a different live session cwd.

#### Scenario: Two sessions use different workspaces
- **WHEN** two live Harness sessions call RepoAtlas with different immutable cwd values
- **THEN** each call SHALL analyze and validate paths only within its own cwd and SHALL not read the other workspace

#### Scenario: Runtime workspace context is unavailable
- **WHEN** a Harness call has no execution, agent, session, non-empty absolute cwd, or live signal
- **THEN** the tool SHALL fail closed before repository, Git, sandbox, subprocess, approval, or filesystem access

### Requirement: The system SHALL partition mutable runtime state by exact Harness session

Analysis sessions, evidence caches, proposal registries, patches, worktrees, commits, landings, lifecycle events, and detached assessments MUST be owned by the exact live Harness session that created them. Process co-residency, equal cwd values, or knowledge of an internal id MUST NOT grant access from another session.

#### Scenario: Sibling session knows a proposal id
- **WHEN** a second Harness session lists proposals or submits an id created by the first session
- **THEN** the second session SHALL receive an empty or blocked session-local result and SHALL not observe or mutate the first session's state

#### Scenario: Sessions share the same cwd
- **WHEN** two distinct live Harness sessions have the same cwd
- **THEN** their analysis and proposal registries SHALL remain separate because cwd equality is not an ownership credential

### Requirement: The system SHALL honor invocation cancellation

Foreground analysis and every asynchronous proposal or controlled-action path MUST observe or forward the invocation `AbortSignal`. A pre-aborted or subsequently aborted call MUST settle with an interrupted, cancelled, or blocked result without upgrading a partial operation to success.

#### Scenario: Analysis is cancelled
- **WHEN** the invocation signal aborts before or during repository discovery
- **THEN** analysis SHALL stop cooperatively, preserve explicit partial/interrupted semantics, and SHALL not register a completed cross-call session

#### Scenario: Proposal operation is cancelled
- **WHEN** the invocation signal aborts during a proposal adapter operation
- **THEN** the operation SHALL preserve existing fail-closed uncertain-state rules and SHALL not report an unobserved patch, commit, landing, or cleanup as complete
