## Context

RepoAtlas 的 proposal lifecycle 已覆盖 isolated worktree、bounded patch、verification、local commit、source landing 和 session-only history。不同阶段的下一步安全性不同：pending draft 可以等待确认或拒绝，dirty applied worktree 不能直接 release，uncertain Git postconditions 不能由工具推断成功或失败。v2.9 将这些既有 registry 状态映射为显式、只读 guidance，不引入新的执行权限。

## Goals / Non-Goals

**Goals:**

- 让调用方在当前 session 内看到一个 deterministic、bounded 的 recommendation 和 allowed actions。
- 将可安全继续的动作限制为现有明确 action：`confirm`、`reject`、`prepare-patch`、`confirm-patch`、`reject-patch`、`verify-patch`、`prepare-commit`、`confirm-commit`、`reject-commit`、`prepare-landing`、`confirm-landing`、`reject-landing`、`release`。
- 对 uncertain、blocked、interrupted 和 terminal 状态提供明确的 `manual-review-required` 或 `no-action` 结论。
- 返回现有 bounded proposal summary，避免泄露路径、digest、patch text、commit message 或 evidence。

**Non-Goals:**

- 不刷新 source/worktree live 状态，也不验证 guidance 是否仍可执行。
- 不执行或模拟任何 Git、approval、Goal、sandbox、subprocess、network 或 filesystem 操作。
- 不将 guidance 当作授权、审批、补丁已应用、commit 已创建、landing 已完成或 recovery 已执行。
- 不持久化 guidance，不跨 session，不建立第二套 proposal registry。

## Decision table

| Registry state | Recommendation | Allowed actions | Manual review |
| --- | --- | --- | --- |
| proposal awaiting confirmation | `confirm` | `confirm`, `reject` | no |
| confirmed, no patch | `prepare-patch` | `prepare-patch`, `release` | no |
| patch awaiting confirmation | `confirm-patch` | `confirm-patch`, `reject-patch`, `release` | no |
| patch applied, verification not run | `verify-patch` | `verify-patch` | no |
| verification passed, no commit | `prepare-commit` | `prepare-commit` | no |
| commit awaiting confirmation | `confirm-commit` | `confirm-commit`, `reject-commit` | no |
| commit created, no landing | `prepare-landing` | `prepare-landing`, `release` | no |
| landing awaiting confirmation | `confirm-landing` | `confirm-landing`, `reject-landing` | no |
| clean terminal/released/rejected | `no-action` | empty or safe existing terminal action | no |
| blocked/interrupted or any uncertain execution status | `manual-review-required` | empty | yes |
| patch/commit/landing terminal state with no safe continuation | `manual-review-required` | empty | yes |

The table is conservative: a listed action is a registry-level suggestion only; the existing manager action must re-check its own live preconditions, digest, expiry and approval boundaries. Guidance never grants permission and never guarantees the action will succeed.

## Invariants

1. `inspect-recovery(proposalId)` reads only the current manager's proposal map and existing bounded summary fields; it never calls adapter methods and never appends v2.8 events.
2. Unknown or empty proposal ids fail closed with no guidance, no summary, no history lookup and no adapter access.
3. `*-creation-unknown`, `patch-application-unknown`, blocked/interrupted proposal or nested operation states always produce `manual-review-required`, `manualReviewRequired=true`, and no allowed execution actions.
4. Guidance output is a detached snapshot. Mutating its summary, allowed actions or reason cannot affect the proposal registry or future guidance.
5. Output contains only a proposal id, existing `ChangeProposalSummary`, bounded/redacted reason, recommendation, finite allowed actions, manual-review flag and `sessionOnly=true`; it contains no path, digest, patch text, commit message, evidence, command or approval data.
6. Repeated guidance queries are deterministic for an unchanged registry and do not alter lifecycle state, execution flags, event history, worktrees or source workspace.

## Failure / Recovery

- Unknown proposal returns blocked without exposing registry size or another proposal's summary.
- An inconsistent combination of nested statuses is treated conservatively as `manual-review-required`; no attempt is made to repair registry state or infer live Git facts.
- If a future execution action rejects the recommendation because live preconditions changed, the existing action's blocked/uncertain semantics remain authoritative; guidance is not refreshed automatically.
- Rollback is code-only: remove the v2.9 source/types/tool/docs/OpenSpec change. No runtime data, worktree, index or external service is changed by this feature.

## Pre-code rehearsal

- Touchpoints: `src/types.ts` for concrete guidance types; `src/repository/change-proposal.ts` for the read-only manager method and pure state table; `src/harness/change-proposal-tool.ts` for action parsing; manager/plugin tests; roadmap, security boundary, Harness docs and v2.9 OpenSpec artifacts.
- Call chain: `repo_atlas_change_proposal(inspect-recovery)` → `proposalInput` → `ChangeProposalManager.inspectRecovery` → summary clone + decision table. It terminates before adapter, approval, Goal, sandbox, subprocess, filesystem and network.
- Shared state: existing `proposals` map only; no new registry, cache, event, singleton or persistence.
- Test isolation: fake adapters assert all Git counters remain unchanged; tests mutate returned summary/actions and re-query; complete lifecycle fixtures exercise legal states while uncertain fixtures assert manual-review fail-safe.
- Likely mistakes and detectors: recommending release for dirty/unknown worktrees (table assertions), treating operationStatus alone as success (execution-status assertions), mutating history (event-count assertions), leaking fields (shape/string assertions), and permitting unknown ids (fail-closed tests).
- Stop condition: any requirement to execute rollback/reset/revert/merge/cleanup, inspect live state, persist guidance, or share across sessions exceeds this change and requires a separate OpenSpec change.

## Verification evidence

- State-machine self-checks cover every legal recommendation row and every illegal/uncertain/terminal row rejected by the decision table.
- Manager tests cover pending, confirmed, patch, verification, commit, landing, release, rejected, blocked, interrupted, uncertain, malformed and clone-isolation cases.
- Harness tests cover schema registration, missing/unknown proposal fail closed and compatibility with existing actions.
- Full tests, lint, native typecheck, independent TypeScript check, OpenSpec strict validation and `git diff --check` are required.
