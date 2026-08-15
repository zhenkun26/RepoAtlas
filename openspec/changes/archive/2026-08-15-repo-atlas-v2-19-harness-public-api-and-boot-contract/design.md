## Context

See `proposal.md` for motivation. v2.18 now consumes the per-call session cwd and signal, but RepoAtlas still owns handwritten Harness facades. The official pin already declares two important contracts: a tool body receives `ToolRunContext`, and sandbox policy resolves from `{ session, mode? }`. The ignored local Harness checkout is one local commit ahead of the public pin for unrelated source-runtime adaptation, so it cannot become release evidence.

The real smoke currently validates bundle composition and then runs a help path that intentionally starts no server. It therefore cannot detect plugin activation, injection, schema, or import failures.

## Goals / Non-Goals

**Goals:**

- Make official public declarations, rather than only RepoAtlas mirrors, the compatibility authority.
- Correct the sandbox-policy request at the adapter boundary and retain exact post-resolution checks.
- Make explicit compatibility smoke prove a settled live Web boot on loopback.
- Keep all external execution manual, pinned, isolated, bounded, and fail-closed.

**Non-Goals:**

- Installing Harness dependencies during ordinary RepoAtlas development or default CI.
- Accepting the ignored local descendant commit as public evidence.
- Publishing RepoAtlas, creating a compiled package, or solving source-package loading; v2.20 owns distribution.
- Triggering a model request or controlled action during live smoke.
- Expanding runtime network, shell, workspace, Git, approval, or persistence authority.

## Decisions

### 1. Keep a small runtime facade, add an official compile-time probe

Runtime source remains decoupled from Harness packages so RepoAtlas unit tests and core analysis stay installable without the external monorepo. A dedicated compatibility probe imports official declarations from the explicit exact checkout and asserts RepoAtlas exports/adapters against them. This avoids making a moving or locally linked Harness package a normal dependency while ensuring handwritten drift fails in the compatibility gate.

Alternative: add Harness packages directly to `devDependencies`. Rejected here because workspace-version packages and their peer graph would couple normal installation to a specific external release and overlap v2.20 distribution decisions.

### 2. Resolve sandbox policy through official session/mode inputs

The adapter calls `sandboxPolicy.resolve({ session, mode })`. It does not send `workspaceRoot`, because the official policy owns root derivation. RepoAtlas then compares the returned mode and resolved absolute root to the already validated session runtime before wrapping argv or spawning. This preserves defense in depth if host policy and plugin state disagree.

Alternative: trust the policy result without comparison. Rejected because root drift would break the existing action/worktree confinement invariant.

### 3. Boot an ephemeral loopback Web server and probe it

After plugin add/config inspection and type contract validation, the smoke spawns fixed `pnpm dsh web --port 0` argv with `shell:false`, sanitized environment, piped bounded output, and a deadline. It parses the official post-settlement `dsh web: http://127.0.0.1:<port>` readiness line, performs one loopback HTTP request with a short timeout, then sends controlled termination and awaits process exit. Any early exit, timeout, malformed/non-loopback URL, non-success response, or output overflow fails.

Alternative: import the plugin module directly. Rejected because that proves syntax/import only, not Loader composition and activation. Alternative: keep `--help`; rejected because Harness documents that this path binds no server.

### 4. Treat checkout cleanliness and exact revision as evidence gates

The compatibility runner verifies exact HEAD and no tracked changes before compile or boot. Ignored dependency artifacts may exist, but the pinned checkout content must be reproducible. The workflow still creates a clean checkout and locked install; local runs that need a different commit must first make that commit public and update the manifest in a separate reviewed change.

## Risks / Trade-offs

- [Live boot can hang] → apply startup, HTTP, shutdown, output, and total deadlines; terminate only the owned child process.
- [Readiness text could change] → bind the parser to the same exact revision as the API probe and manifest.
- [Type probe may depend on built declarations] → fail clearly when declarations are absent; the manual workflow builds/installs the pinned checkout before validation.
- [Local ahead checkout cannot run the smoke] → report revision drift; do not silently reset or modify user reference state.
- [No actual tool call in smoke] → unit tests cover execution semantics; a future authenticated/session fixture can add invocation without weakening this boot contract.

## Migration Plan

1. Land v2.18 session runtime behavior first.
2. Add official contract validation and correct service request shapes.
3. Upgrade the explicit smoke and manual workflow.
4. Keep old source-first installation docs until v2.20 replaces distribution.

Rollback removes the probe/live-boot additions and restores the prior adapter, with no state migration because all runtime state is session-only. Rollback must not change the public revision or rewrite the ignored Harness checkout.
