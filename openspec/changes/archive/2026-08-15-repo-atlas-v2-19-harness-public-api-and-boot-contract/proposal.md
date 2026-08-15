## Why

RepoAtlas currently mirrors selected Harness interfaces by hand and its compatibility smoke stops after config composition and `--help`, so API drift and plugin activation failures can both pass unnoticed. The v2.18 cwd fix also exposed one concrete mismatch: the official sandbox-policy service resolves from `{ session, mode? }`, not a caller-supplied workspace root.

## What Changes

- Bind a compile-time contract probe to the exact public Harness revision and its exported `ToolDefinition`, `ToolRunContext`, Cordis context, session, approval, Goal, sandbox-policy, sandbox, and subprocess surfaces.
- Align runtime adapters with official request shapes, including sandbox policy resolution from the calling session and approved mode followed by exact root/mode verification.
- Strengthen compatibility validation so it starts the composed Web profile on an ephemeral loopback port, waits for the Harness readiness signal, and probes the live endpoint before terminating the owned process.
- Keep the public revision authoritative; an ahead/diverged ignored checkout remains invalid evidence and no local-only commit becomes a compatibility pin.
- Keep external clone/install/boot in the explicit manual compatibility workflow; default tests remain offline and use structural fakes.
- Preserve existing Goal, approval, sandbox, subprocess, session-only state, no-network runtime, and no-publish boundaries.

## Capabilities

### New Capabilities

- `harness-public-api-contract`: Defines compile-time binding and live boot evidence against one exact public DeepSeek Harness revision.

### Modified Capabilities

- `source-distribution-readiness`: Strengthens the real Harness smoke from config/help inspection to actual bounded Web boot and readiness probing while preserving explicit external execution.
- `controlled-actions`: Aligns sandbox-policy resolution with the official per-session public API and retains exact policy verification before subprocess execution.

## Impact

Affected areas include `src/harness/public.ts`, controlled-action and verification adapters, compatibility scripts/workflows, pinned reference metadata, plugin tests, and Harness/security/release documentation. No dependency installation, publication, tag, release, push, or plugin runtime network authority is introduced by implementation.
