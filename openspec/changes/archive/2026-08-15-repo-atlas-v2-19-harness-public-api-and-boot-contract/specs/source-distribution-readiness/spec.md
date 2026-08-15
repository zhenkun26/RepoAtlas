## MODIFIED Requirements

### Requirement: The real Harness smoke SHALL be explicit, isolated, and bounded

The real Harness smoke runner MUST derive the RepoAtlas root from its current working directory, require an explicit clean Harness checkout root, verify the exact manifest revision, use fixed `pnpm` argument vectors with `shell: false`, and isolate profile state under a task-owned temporary `DSH_HOME`. It MUST install the local RepoAtlas bundle into the `web` profile, inspect the composed config for `repo-atlas/harness`, compile-check the plugin against official public type declarations, start the Web profile on loopback with an ephemeral port, wait for post-settlement readiness, probe the live endpoint, and terminate the owned process. `--help`, config composition, or module syntax alone MUST NOT count as live compatibility evidence.

#### Scenario: A pinned checkout loads the bundle
- **WHEN** the manual compatibility workflow checks out the manifest revision, installs the locked Harness dependencies, and invokes the runner
- **THEN** the runner SHALL verify the revision, add the local RepoAtlas bundle, observe `repo-atlas/harness` in config, pass the official API contract, observe live Web readiness, receive a successful bounded loopback response, and terminate its process successfully

#### Scenario: The checkout or Harness command is unavailable
- **WHEN** the Harness root is missing or dirty, the revision differs, dependencies or official declarations are unavailable, plugin activation fails, readiness times out, the endpoint probe fails, or any fixed command exits nonzero
- **THEN** the runner SHALL fail with bounded diagnostics, terminate only its owned process, and SHALL NOT claim readiness, alter the RepoAtlas checkout, attempt rollback in the Harness checkout, or access a non-loopback endpoint
