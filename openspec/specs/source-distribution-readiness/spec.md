# source-distribution-readiness Specification

## Purpose
Define the source-first delivery and pinned external DeepSeek Harness compatibility evaluation for RepoAtlas. This capability is repository tooling and documentation; it does not grant the plugin runtime network, Shell, installation, persistence, or release authority.
## Requirements
### Requirement: The repository SHALL retain a source-first distribution contract

The repository MUST keep `package.json` `private: true`, license `MIT`, built `dist/` entry points, and the `dsh.bundle.patch` declaration. It MUST state that a local packed artifact is diagnostic only and MUST NOT claim npm publication or a support guarantee for arbitrary consumer versions.

#### Scenario: A contributor evaluates the local artifact
- **WHEN** a clean checkout runs `npm run verify:built-artifact`
- **THEN** the command SHALL build locally, create a task-owned tarball, install it offline into a task-owned consumer, import the built root and Harness exports, and exit successfully without publishing or changing tracked checkout files

#### Scenario: The source-first posture is inspected
- **WHEN** a contributor reads package metadata, README, and release guidance
- **THEN** they SHALL find `private: true`, built exports and allowlisted artifact contents, the local artifact limitation, and no claim that an npm package has been published

### Requirement: The compatibility target SHALL be pinned to a public Harness revision

The repository MUST contain a compatibility manifest naming the public DeepSeek Harness repository, a descriptive branch ref, an exact revision, the `web` profile, Node 24.x, and pnpm 11.7.0. The exact revision MUST be authoritative for the smoke; the branch ref MUST NOT substitute for the revision.

#### Scenario: The local reference checkout is not public evidence

- **WHEN** the ignored local reference checkout is ahead of, behind, or different from the manifest revision
- **THEN** the real Harness smoke SHALL fail closed and SHALL NOT report compatibility success

#### Scenario: The public pin is reviewed

- **WHEN** a maintainer inspects the manifest and workflow
- **THEN** both SHALL identify the same exact Harness revision and toolchain, and the workflow SHALL check out that revision rather than a moving branch

### Requirement: The real Harness smoke SHALL be explicit, isolated, and bounded

The real Harness smoke workflow MUST derive the RepoAtlas root from its current working directory, require an explicit clean Harness checkout root, verify the exact manifest revision, install locked dependencies, and complete the pinned Harness repository's declared root build before invoking the compatibility runner. The runner MUST use fixed `pnpm` argument vectors with `shell: false`, isolate profile state under a task-owned temporary `DSH_HOME`, install the local `dsh-repo-atlas` bundle into the `web` profile, inspect the composed config for `dsh-repo-atlas/harness`, compile-check the plugin against official public type declarations, start the Web profile on loopback with an ephemeral port, wait for post-settlement readiness, probe the live endpoint, and terminate the owned process. `--help`, config composition, module syntax, or a host-only build alone MUST NOT count as live compatibility evidence.

#### Scenario: A pinned checkout loads the bundle

- **WHEN** the manual compatibility workflow checks out the manifest revision, installs the locked Harness dependencies, completes the pinned root build, and invokes the runner
- **THEN** the runner SHALL verify the revision, add the local `dsh-repo-atlas` bundle, observe `dsh-repo-atlas/harness` in the composed web profile, pass the official API contract, observe live Web readiness, receive a successful bounded loopback response, and terminate its process successfully

#### Scenario: The checkout or Harness command is unavailable

- **WHEN** the Harness root is missing or dirty, the revision differs, dependencies, declarations, or required build outputs are unavailable, plugin activation fails, readiness times out, the endpoint probe fails, or any fixed command exits nonzero
- **THEN** the runner SHALL fail with bounded diagnostics, terminate only its owned process, and SHALL NOT claim readiness, alter the RepoAtlas checkout, attempt rollback in the Harness checkout, or access a non-loopback endpoint

### Requirement: External compatibility execution SHALL remain outside default runtime and quality authority

The repository MUST provide the real Harness smoke only through an explicit manual workflow with `contents: read`. The default quality workflow MAY run the local artifact smoke but MUST NOT clone or install the external Harness. No runtime plugin path may invoke either smoke runner.

#### Scenario: A pull request runs default CI

- **WHEN** the Node 22/24 quality workflow runs
- **THEN** it SHALL run the local artifact smoke without external Harness installation, publishing, tagging, deployment, or remote RepoAtlas runtime operation

#### Scenario: A maintainer invokes external compatibility validation

- **WHEN** the maintainer starts the dedicated workflow manually
- **THEN** it SHALL use the exact pinned checkout, frozen lockfile install, and fail-closed smoke steps under read-only repository permissions

### Requirement: Public attribution and release claims SHALL remain separated

The documentation MUST preserve the MIT permission to use, modify, and redistribute when the notice and disclaimer are retained, while separately requesting that public references identify RepoAtlas / 代码星图 and link the canonical source repository. A smoke workflow definition or local artifact pass MUST NOT be described as a public release, npm publication, or completed real-Harness support claim.

#### Scenario: A downstream project cites RepoAtlas

- **WHEN** a downstream integration documents or redistributes RepoAtlas
- **THEN** the guidance SHALL point to `NOTICE.md` and the canonical source link while keeping the provenance request distinct from MIT legal conditions

#### Scenario: External evidence is still pending

- **WHEN** no successful manual Harness smoke run has been reviewed
- **THEN** the release checklist SHALL keep real-Harness compatibility and first-public-release items unchecked
