# public-release-readiness Specification

## Purpose
Define the repository-level contract for a source-first public release baseline. This capability governs documentation, legal metadata, delivery gates, and release boundaries; it does not grant runtime authority or change RepoAtlas lifecycle behavior.
## Requirements
### Requirement: The repository SHALL declare a source-first distribution posture

The repository MUST declare an explicit license, package license metadata, supported Node.js baseline, source entry points, and the fact that npm publication and compiled distribution are not yet enabled. README and release checklist MUST provide a reproducible local validation path and MUST NOT describe a package publication or release tag that does not exist.

#### Scenario: A clean checkout can discover the supported local path

- **WHEN** a contributor reads the root README and package metadata
- **THEN** they SHALL find Node.js 22+, `npm ci`, the test/lint/typecheck commands, the OpenSpec validation command, and the source-first Harness plugin installation path

#### Scenario: The repository does not imply an npm release

- **WHEN** a contributor inspects `package.json` and the release checklist before the distribution decision
- **THEN** `private` SHALL remain `true`, no compiled `dist/` contract SHALL be claimed, and npm publication SHALL be listed as a follow-up rather than a completed capability

### Requirement: The repository SHALL provide public governance and security guidance

The repository MUST contain root-level `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, and `CHANGELOG.md` files. The documents MUST identify contribution validation, OpenSpec boundary rules, responsible vulnerability reporting, conduct expectations, and the difference between unreleased work and a public version.

#### Scenario: A prospective contributor can validate a change

- **WHEN** a contributor follows `CONTRIBUTING.md`
- **THEN** the document SHALL identify the supported Node.js version, dependency installation, required quality gates, and the rule to create a new OpenSpec change for new behavior

#### Scenario: A security reporter has a private reporting path

- **WHEN** a security issue is suspected
- **THEN** `SECURITY.md` SHALL direct the reporter to a private repository security channel when available and SHALL explicitly discourage public issue disclosure of unpatched vulnerabilities

### Requirement: The repository SHALL state MIT permission and project provenance expectations

The repository MUST state that MIT permits use, modification, and redistribution when the license notice and disclaimer are retained. It MUST separately request that public citations, integrations, documentation, and derivative projects identify RepoAtlas / 代码星图 and link the source repository. The provenance request MUST be described as project guidance and MUST NOT be presented as an additional legal condition of the MIT License.

#### Scenario: A public integration can identify the source

- **WHEN** a contributor or downstream project publicly references or integrates RepoAtlas
- **THEN** the repository guidance SHALL provide the project name and canonical source link, and SHALL direct the reader to retain the MIT notice when redistributing

### Requirement: The repository SHALL enforce repeatable pull-request quality gates

The repository MUST provide a GitHub Actions workflow on pull requests and pushes to `main`. The workflow MUST run on Node.js 22 and 24, use the committed lockfile with `npm ci`, and execute test, lint, typecheck, strict OpenSpec validation, and `git diff --check`. A failed or unavailable OpenSpec download MUST fail the workflow rather than skip the gate.

#### Scenario: A supported Node version executes all gates

- **WHEN** GitHub Actions runs for Node.js 22 or 24
- **THEN** the workflow SHALL install from `package-lock.json` and execute all repository quality gates before succeeding

#### Scenario: Release side effects are excluded from CI

- **WHEN** the workflow succeeds
- **THEN** it SHALL not publish packages, create tags/releases, push generated commits, deploy services, or invoke remote RepoAtlas runtime operations

### Requirement: The repository SHALL document bounded release follow-up work

The roadmap and release checklist MUST distinguish completed runtime versions, the current v2.12 public-release baseline, and later v2.13/v2.14 work. The checklist MUST keep license-owner confirmation, real Harness smoke validation, distribution decision, tag/release, and publish/push authorization as separately reviewable items.

#### Scenario: Future work has one OpenSpec boundary per outcome

- **WHEN** a future contributor starts v2.13 or v2.14 work
- **THEN** the roadmap SHALL direct them to create a new OpenSpec change and SHALL not treat this v2.12 change as permission to implement, publish, or archive later outcomes
