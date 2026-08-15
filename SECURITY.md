# Security Policy

## Scope

RepoAtlas is designed to analyze local repositories within explicit path, budget, redaction, and read-only boundaries. Security reports are especially valuable when they show a way to escape those boundaries, disclose sensitive content, execute an unapproved command, access the network, or persist or upload session-only data.

The ignored `reference/deepseek-harness/` checkout is a compatibility reference, not a RepoAtlas runtime dependency. Reports about that upstream project should be sent to its maintainers.

## Reporting a vulnerability

Please report suspected vulnerabilities privately through the repository's GitHub Security Advisories or private vulnerability reporting channel when it is enabled. If that channel is unavailable, contact the repository maintainers through a private GitHub message and request a security-reporting route.

Please do not open a public issue, discussion, or pull request for an unpatched vulnerability. Include a concise impact description, reproduction steps, affected revision or file, and any safe mitigation you know. Remove secrets and personal data from the report.

## Response expectations

Maintainers will acknowledge a private report when practicable, reproduce it in an isolated environment, and coordinate a fix or mitigation before public disclosure. There is currently no guaranteed response time or supported-version SLA; the first public release will establish those commitments separately.

Security fixes must preserve the existing fail-closed behavior and must be covered by regression tests and an OpenSpec boundary when they add or change capability.
