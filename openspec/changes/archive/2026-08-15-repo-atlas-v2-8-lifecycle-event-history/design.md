## Context

RepoAtlas 当前的 proposal registry 是 session-only memory，并已包含 proposal、patch、verification、commit、landing 五层状态。v2.8 需要补充可读的转移时间线，但不能建立第二套持久化 registry，也不能让只读查询重新解释或修复状态。

## Goals / Non-Goals

**Goals:**

- 对当前 session 中已知 proposal 返回 bounded lifecycle events。
- 记录真实发生的状态变更、失败、中止和 postcondition unknown，并保存变更后的 proposal/operation/execution 状态快照。
- 事件原因统一 bounded、secret-like redacted；查询按事件追加顺序返回最近的有限条目，并报告当前内存保留总数及是否因查询上限截断。
- 复用已有 `limit` 安全整数边界和 manager 内存边界，不新增外部权限。

**Non-Goals:**

- 不提供跨 session、持久化、不可抵赖审计、团队共享或远程事件流。
- 不记录纯观察调用、未改变状态的校验失败、approval 被拒绝且 draft 仍 awaiting-confirmation 的调用。
- 不对 `creation-unknown`、dirty、revision mismatch 或 live observation 做自动解释、修复、回滚或状态升级。
- 不实现 rollback、merge、冲突解决、patch 生成或新的 Git 操作。

## Transition table

| Trigger | Phase | Event snapshot | Must not record |
| --- | --- | --- | --- |
| `prepare` stores a proposal | `proposal` | `proposal` | validation-only rejection |
| `confirm` creates a worktree | `proposal` | `worktree-created` | digest mismatch |
| `confirm`/`release` mutates to blocked/interrupted | `proposal` or `release` | resulting status and `blocked` operation | read-only precondition result |
| `reject` changes proposal status | `proposal` | `blocked` operation with `rejected` status | repeated reject |
| `prepare-patch`, apply, reject, patch failure | `patch` | resulting operation/execution snapshot | review/export |
| verification result is recorded | `verification` | `patch-verification-*` | duplicate terminal verification read |
| `prepare-commit`, create, reject, commit failure | `commit` | resulting operation/execution snapshot | digest mismatch or denied approval that leaves draft pending |
| `prepare-landing`, land, reject, landing failure | `landing` | resulting operation/execution snapshot | digest mismatch or denied approval that leaves draft pending |
| clean owned worktree is released | `release` | `released` | dirty/unowned refusal unless lifecycle status actually changes |

The event sequence is append-only within the live manager and is returned in chronological order. Retention is bounded by `limits.maxHistoryEvents`; when the bound is exceeded, the oldest retained entries are evicted. `history` may return the newest `limit` retained events in chronological order.

## Invariants

1. Only the proposal object's actual state mutations listed in the transition table can append events; read-only APIs never append.
2. Every event has a fresh event id, bounded/redacted reason, phase, proposal status, operation status, execution status snapshot, ISO timestamp, and `sessionOnly: true`.
3. Event history is keyed by the current manager's proposal object/session memory and is never serialized, written to the workspace, or used to call Git, approval, Goal, sandbox, subprocess, or network capabilities.
4. Unknown proposal ids and invalid history limits fail closed with empty events and no adapter access. Returned events are detached objects; mutating a result cannot mutate the retained history.
5. History does not upgrade or normalize uncertain/non-executed states. `patch-application-unknown`, `commit-creation-unknown`, `landing-creation-unknown`, `patch-not-applied`, `commit-not-created`, and `push-not-performed` remain represented by the snapshots already stored in the proposal.
6. Event retention and result limits are positive safe integers. A limit cannot expose more than the configured API maximum, and an internal retention cap cannot grow without bound.

## Failure / Recovery

- Invalid or missing `proposalId`, invalid `limit`, or unknown proposal returns blocked with no event lookup that exposes registry contents and no adapter call.
- Event creation is in-process only. If bounded redaction or cloning is required, it fails closed without changing proposal state; no best-effort persistence or external fallback is attempted.
- When retention evicts old events, the current retained timeline remains usable and `truncated` reports query truncation relative to the retained set. No attempt is made to reconstruct evicted history.
- A code rollback removes the v2.8 manager/types/tool/spec changes; there is no migration or external state to restore. Existing proposal lifecycle behavior remains the recovery baseline.

## Pre-code rehearsal

- Touchpoints: `src/types.ts` for concrete event/request/result types; `src/repository/change-proposal.ts` for limits, in-memory history, recorder hooks and query; `src/harness/change-proposal-tool.ts` for action parsing/execution; focused manager/plugin tests; v2.8 OpenSpec, roadmap, security boundary and Harness docs.
- Call chain: `history` tool → `proposalInput` → `ChangeProposalManager.history` → detached in-memory event clone. It terminates before adapter, approval, Goal, sandbox, subprocess, filesystem or network. Mutation event recording is called only from existing local lifecycle assignments.
- Shared mutable state: manager `proposals` and new per-proposal event map/recorder; no singleton, cache file, environment write or external registry.
- Test isolation: each fixture creates a new manager and fake adapter; tests assert `inspectCount`, `inspectSourceCount` and mutation counters remain unchanged for history/read-only calls, and mutate returned event objects before re-querying.
- Likely mistakes and detectors: recording read-only queries (assert history count unchanged), missing a legal transition (transition-table tests), unbounded retention (custom low limit test), exposing secret/path content (redaction and field-shape tests), aliasing retained events (clone-isolation test), and accepting invalid limits (fail-closed tests).
- Stop condition: any requirement to persist, share across sessions, add rollback/merge, or expose raw paths/digests would exceed this change and must be split into a new OpenSpec change.

## Verification evidence

- State-machine self-checks cover every listed legal event-producing transition and illegal/no-transition calls such as inspect/list/live/review/export, digest mismatch, repeated terminal actions, invalid limits and unknown ids.
- Focused manager tests cover chronological order, bounded retention, query truncation, failed/interrupted/uncertain snapshots, redaction, no adapter calls and detached results.
- Harness tests cover `history` schema, required proposal id, invalid/missing limit fail-closed behavior and existing action compatibility.
- Full tests, lint, native typecheck, independent TypeScript check, OpenSpec strict validation and `git diff --check` are required.
