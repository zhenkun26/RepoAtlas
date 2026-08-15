## Purpose

Provide a bounded session-only observation of whether a managed proposal worktree currently satisfies the existing release preconditions, without performing cleanup or granting authorization.

## ADDED Requirements

### Requirement: The system SHALL expose bounded release readiness inspection

系统 MUST 提供 `inspect-release` action，接收当前 session 中已知的 `proposalId`，并从 proposal registry 派生 proposal state 和 session-owned worktree identity。对于可检查的 proposal，系统 MUST 返回 detached 的 `ChangeProposalResult` 与 release assessment；assessment MUST 包含有限的 status、relation、bounded reason、checkedAt 和 `sessionOnly=true`，并且只在可证明时包含 `clean` 与 `identityMatches` 布尔事实。

#### Scenario: A proposal without a managed worktree is not applicable

- **WHEN** proposal 已知但没有 session-owned worktree
- **THEN** 系统 SHALL 返回 status=`not-applicable`、relation=`not-applicable` 的 assessment，不调用 adapter、不创建 worktree，也不执行 release

#### Scenario: A confirmed clean owned worktree is ready for a separate release request

- **WHEN** proposal status=`confirmed`、存在 managed worktree，且只读 inspection 证明 identity 匹配并且 worktree clean
- **THEN** 系统 SHALL 返回 status=`available`、relation=`ready`、`clean=true` 和 `identityMatches=true`，并明确 release 尚未执行且该 observation 不授予 authorization

#### Scenario: A retained worktree with a non-confirmed proposal state is blocked

- **WHEN** proposal 保留 worktree 但 proposal status 不是 `confirmed`
- **THEN** 系统 SHALL 返回 status=`available`、relation=`proposal-state-blocked`，不得把该状态报告为 ready 或调用 remove

### Requirement: The system SHALL fail safe for dirty, mismatched, and uncertain worktree state

只读 inspection 发现 worktree dirty 时，系统 MUST 返回 relation=`worktree-dirty`；发现当前 identity 与 session-owned identity 不匹配时，系统 MUST 返回 relation=`identity-mismatch`；adapter inspection 失败或 AbortSignal 中止时，系统 MUST 返回 status=`unknown`、relation=`unknown`。这些结果都 MUST 不执行 remove、release、cleanup 或其他 Git mutation。

#### Scenario: Dirty worktree is not release-ready

- **WHEN** confirmed proposal 的 managed worktree 有未提交改动
- **THEN** 系统 SHALL 返回 status=`available`、relation=`worktree-dirty`、`clean=false`，不得返回 ready 或执行 cleanup

#### Scenario: Identity mismatch is not release-ready

- **WHEN** worktree inspection 返回的 identity 不等于 proposal 记录的 session-owned identity
- **THEN** 系统 SHALL 返回 status=`available`、relation=`identity-mismatch`、`identityMatches=false`，不得调用 remove

#### Scenario: Inspection failure and abort remain unknown

- **WHEN** adapter inspection 失败，或调用前 AbortSignal 已中止
- **THEN** 系统 SHALL 返回 status=`unknown`、relation=`unknown`，不得猜测 ready；已中止调用不得访问 adapter

### Requirement: The system SHALL preserve session-only, detached, and non-execution boundaries

缺少或未知的 proposalId MUST 在 adapter access 之前返回 blocked 且不包含 assessment。重复调用 MUST 不修改 proposal registry、nested execution status 或 lifecycle history，不追加 event，不跨 session、不写 filesystem、不联网、不请求 approval/Goal。assessment MUST 不包含 absolute path、changed path name、patch text、digest、command 或 approval data，并且调用方修改返回对象不得改变 manager 内部状态。

#### Scenario: Unknown proposal is denied before adapter access

- **WHEN** 调用方省略或提供当前 session 未知的 proposalId
- **THEN** 系统 SHALL 返回 blocked 且 assessment 缺失，所有 inspection 和 mutation counters 保持不变

#### Scenario: Repeated readiness inspection is advisory only

- **WHEN** 调用方对本地事实未变化的 proposal 重复执行 `inspect-release`
- **THEN** 系统 SHALL 返回一致的 relation 和 facts，release、remove、event history 与 lifecycle state 保持不变；修改第一次返回的 assessment 不得影响第二次返回
