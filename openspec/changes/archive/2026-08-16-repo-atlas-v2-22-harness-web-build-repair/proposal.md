## Why

The manual compatibility workflow builds only pinned Harness host declarations before starting `dsh web`, but the pinned Web runtime requires `apps/web/dist/index.html`. As a result, the intended live activation evidence fails before RepoAtlas can complete its bounded loopback probe.

## What Changes

- Build the pinned Harness repository through its declared root build contract before invoking the RepoAtlas compatibility smoke.
- Preserve exact-revision checkout, frozen dependency installation, read-only workflow permissions, bounded runtime probing, and owned-process cleanup.
- Record the repaired build precondition in the live-boot and source-distribution contracts.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `harness-public-api-contract`: require live-boot evidence to use the pinned Harness host, client, and Web build outputs.
- `source-distribution-readiness`: require the dedicated manual workflow to complete the pinned root build before the compatibility runner starts.

## Impact

Affected areas are `.github/workflows/harness-compatibility.yml`, compatibility documentation/checklists, and the manual external smoke. Default CI, RepoAtlas runtime authority, package publication, and release behavior remain unchanged.
