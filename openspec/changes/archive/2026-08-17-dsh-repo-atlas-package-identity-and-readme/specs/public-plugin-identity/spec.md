# public-plugin-identity Specification

## Purpose

Define a self-explanatory DeepSeek Harness package and bundle identity without changing the existing tool API or runtime authority boundaries.

## ADDED Requirements

### Requirement: The public package identity SHALL identify DeepSeek Harness and the feature

The package metadata, Harness plugin export, bundle patch id, and visible Harness bundle name MUST use `dsh-repo-atlas` and `dsh-repo-atlas/harness` respectively. The GitHub repository and product brand MAY remain `RepoAtlas`.

#### Scenario: A user inspects the package

- **WHEN** a user reads package metadata or installs the local bundle through the source-first Harness path
- **THEN** the package SHALL be identified as `dsh-repo-atlas` and the Harness profile SHALL show `dsh-repo-atlas/harness`

#### Scenario: A user calls existing tools

- **WHEN** an existing Harness caller invokes the analysis or change-proposal tools
- **THEN** the tool names SHALL remain `repo_atlas_analyze` and `repo_atlas_change_proposal`, with their existing input, output, and authority contracts unchanged

### Requirement: Identity verification SHALL be consistent across built artifacts

The package lock metadata, built-artifact smoke, compatibility smoke, and tests MUST assert the same `dsh-repo-atlas` package and Harness bundle identity. Verification MUST continue to use built ESM/declarations and MUST NOT add a source-loader or publication step.

#### Scenario: A packed artifact is installed offline

- **WHEN** the local built tarball is installed into a task-owned offline consumer
- **THEN** imports of `dsh-repo-atlas` and `dsh-repo-atlas/harness` SHALL resolve, and the Harness export SHALL report `name === 'dsh-repo-atlas'`

### Requirement: The rename SHALL not expand runtime authority

The identity rename MUST NOT add network access, arbitrary Shell execution, dependency installation, persistent state, cross-session state, automatic patching, automatic commit, automatic landing, or automatic push. The package MUST remain private and source-first.

#### Scenario: A maintainer reviews the rename

- **WHEN** the package identity change is applied
- **THEN** `private: true`, MIT licensing, session-only boundaries, explicit approval gates, and the existing fail-closed behavior SHALL remain intact
