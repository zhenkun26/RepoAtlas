## Context

The pinned Harness root package defines `build` as host and client library builds followed by the Web frontend build. The current workflow runs only `build:lib:host`, so `dsh web` cannot resolve its required frontend `dist/index.html`.

## Goals / Non-Goals

**Goals:**

- Build exactly the pinned repository through its own declared root build contract before live boot.
- Preserve the existing bounded smoke and manual-only workflow boundary.

**Non-Goals:**

- Moving external Harness installation or boot into default CI.
- Changing the compatibility pin, workflow permissions, release state, or RepoAtlas runtime behavior.

## Decisions

- Replace the host-only workflow build with `pnpm run build`. Reusing the pinned repository's root contract is safer than duplicating an assumed subset such as `build:lib:host` plus `build:web`, because the root script owns host/client/Web ordering.
- Keep RepoAtlas build and dependency installation as separate existing steps. This preserves evidence attribution and avoids introducing a mixed build wrapper.
- Use the actual manually dispatched GitHub Actions run as the final environment acceptance gate; local source inspection cannot prove hosted runner boot behavior.

## Risks / Trade-offs

- [Risk] The full Harness build takes longer than the host-only step. → Retain the bounded job timeout and inspect the first run duration; increase only through a separate reviewed change if required.
- [Risk] Build succeeds but startup or cleanup still fails. → Keep readiness, HTTP probe, output budget, and owned-process termination checks unchanged.

## Migration Plan

Update the single workflow build command and supporting status documentation. Rollback restores the previous command, but the workflow must then remain explicitly unverified rather than claiming live compatibility.
