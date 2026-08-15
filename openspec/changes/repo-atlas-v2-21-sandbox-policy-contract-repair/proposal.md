## Why

The exact pinned DeepSeek Harness sandbox-policy service accepts the full `SandboxMode` vocabulary, including `danger-full-access`, while RepoAtlas's local structural facade narrows the request to confined modes. That narrowing makes the official service fail RepoAtlas's own compile-time contract even though runtime execution correctly rejects unconfined results.

## What Changes

- Make the local sandbox-policy request facade structurally compatible with all official pinned Harness modes.
- Preserve RepoAtlas's existing runtime authority: controlled actions and patch verification continue to accept only `read-only` or `workspace-write` results and fail closed before sandbox or subprocess access otherwise.
- Add regression coverage for an official `danger-full-access` result and re-run the exact-pin API contract.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `harness-public-api-contract`: require the local sandbox-policy facade to model the complete official request vocabulary while keeping RepoAtlas runtime enforcement confined.

## Impact

Affected areas are `src/harness/public.ts`, the controlled-action adapter tests, and the exact-pin API contract. No dependency, persistence, network, release, or runtime permission is added.
