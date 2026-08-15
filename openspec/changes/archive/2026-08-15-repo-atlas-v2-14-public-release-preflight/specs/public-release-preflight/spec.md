# public-release-preflight Specification

## Purpose

Define a source-first public release candidate preflight and its support/release governance. This capability is read-only repository tooling and does not create or authorize external release state.

## Requirements

## ADDED Requirements

### Requirement: The repository SHALL publish an explicit source-first support policy

The repository MUST document the proposed first-release support baseline: Node.js 22+, CI coverage on Node.js 22/24, the exact pinned DeepSeek Harness compatibility revision and toolchain, private security reporting, best-effort support without an SLA, MIT notice/disclaimer retention, and separate RepoAtlas / 代码星图 attribution guidance. It MUST identify raw TypeScript npm consumer imports, arbitrary Harness refs/forks, and unsupported Node versions as outside the current contract.

#### Scenario: A downstream user evaluates support

- **WHEN** a user reads the support policy and Harness compatibility manifest
- **THEN** they SHALL find the supported Node baseline, exact Harness compatibility target, source-first loading path, security reporting route, and explicit unsupported cases

#### Scenario: MIT permission is distinguished from provenance guidance

- **WHEN** a user redistributes or cites RepoAtlas
- **THEN** the guidance SHALL require retaining the MIT notice/disclaimer and separately request identifying RepoAtlas / 代码星图 with the canonical source link

### Requirement: The repository SHALL define a manual source-first release process

The repository MUST document candidate version selection, human copyright-holder confirmation, changelog/release-note review, exact commit verification, manual tag/GitHub Release creation, and the continued no-npm posture. The procedure MUST state that all tag, release, publish, push, and deployment actions require separate explicit authorization.

#### Scenario: A maintainer prepares a first release

- **WHEN** a maintainer follows the release process
- **THEN** they SHALL run the read-only preflight, review the exact candidate commit and release notes, and encounter explicit human gates before creating any external release state

#### Scenario: A source-first release is completed

- **WHEN** the first public release is authorized
- **THEN** it SHALL identify the RepoAtlas source checkout/tag and release notes without implying an npm package or compiled distribution

### Requirement: The release preflight SHALL be read-only and fail closed

`npm run verify:release-preflight` MUST inspect package/license/source-first metadata, required governance documents, checklist evidence, active OpenSpec directories, worktree cleanliness, and local `origin/main` equality using fixed local operations. It MUST emit bounded JSON with `ready` or `blocked`, blocker codes, the observed revision, and explicit false `tagCreated`, `releaseCreated`, `publishPerformed`, and `networkAccessed` fields. It MUST return nonzero for blockers and MUST never create or authorize release state.

#### Scenario: The candidate has unresolved human gates

- **WHEN** copyright-holder confirmation or release notes remain unchecked
- **THEN** preflight SHALL return `blocked` with the corresponding blocker codes and SHALL not claim release readiness

#### Scenario: The candidate is dirty, drifted, or actively changing

- **WHEN** the worktree is dirty, local HEAD differs from local `origin/main`, or an active OpenSpec change exists
- **THEN** preflight SHALL return `blocked` without reset, clean, fetch, commit, archive, or push

#### Scenario: A fully reviewed candidate is observed

- **WHEN** all declared documents, checklist gates, local Git facts, and source-first metadata pass
- **THEN** preflight MAY return `ready`, but SHALL still report tag/release/publish/network as false and SHALL not execute any external action

### Requirement: Release candidate automation SHALL remain manual and side-effect free

The repository MUST provide any release-preflight CI only through `workflow_dispatch` with `contents: read`. The workflow MAY install dependencies and run quality checks, but MUST NOT invoke tag, release, publish, push, deployment, credential, or remote API operations.

#### Scenario: Default CI runs on pull request or push

- **WHEN** the normal quality workflow runs
- **THEN** it SHALL not run release preflight or any release side effect

#### Scenario: A maintainer starts release preflight

- **WHEN** the dedicated workflow is manually dispatched
- **THEN** it SHALL run the declared quality gates and read-only preflight, failing closed on blockers without bypassing them

### Requirement: The release checklist SHALL distinguish candidate readiness from release completion

The release checklist MUST record the successful v2.13 pinned Harness smoke and README recheck, keep copyright-holder confirmation and release-note creation as human gates, and keep tag/GitHub Release/npm publication unchecked until separately authorized and executed. The roadmap MUST identify v2.14 as release preparation rather than a completed public release.

#### Scenario: v2.13 evidence is reviewed

- **WHEN** the successful pinned smoke and README validation are available
- **THEN** the checklist SHALL mark those evidence items complete with the exact compatibility revision and retain the remaining release gates

#### Scenario: Preflight is green before external release

- **WHEN** a candidate preflight returns `ready`
- **THEN** the checklist SHALL still distinguish that observation from a created tag, GitHub Release, published package, or deployed service
