# harness-public-api-contract Specification Delta

## MODIFIED Requirements

### Requirement: Live boot evidence SHALL prove plugin activation

The explicit compatibility smoke MUST use the exact pinned Harness checkout after its declared root build has produced the host, client, and Web frontend outputs. It MUST start the composed Harness Web profile with `dsh-repo-atlas` installed, wait for the post-settlement readiness signal, probe the live loopback endpoint, and terminate only the process it started. Config composition, `--help` output, or a host-only build MUST NOT count as plugin activation evidence.

#### Scenario: The plugin boots in the pinned Web profile

- **WHEN** the exact checkout has its locked dependencies and complete declared root build outputs and the explicit smoke runs
- **THEN** the profile SHALL compose `dsh-repo-atlas/harness`, reach the Harness Web readiness signal, answer a bounded loopback probe, and exit after controlled termination

#### Scenario: Plugin loading fails or never settles

- **WHEN** the plugin has an import, registration, schema, injection, activation, missing-build-output, or readiness failure before the deadline
- **THEN** the smoke SHALL terminate its owned process, fail with bounded output, and SHALL NOT claim compatibility
