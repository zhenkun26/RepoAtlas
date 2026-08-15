# lifecycle-event-history Specification

## Purpose
TBD - created by archiving change repo-atlas-v2-8-lifecycle-event-history. Update Purpose after archive.
## Requirements
### Requirement: The system SHALL record bounded session-only lifecycle events

系统 MUST 为当前 manager session 中的每个已创建 proposal 维护 bounded lifecycle event history。事件 MUST 只在 proposal、worktree、patch、verification、commit、landing 或 release 的实际状态变更后追加，并 MUST 包含 eventId、proposalId、phase、proposal status、operationStatus、executionStatus 快照、bounded/redacted reason、createdAt 和 `sessionOnly=true`。事件 MUST 按追加顺序保留，超过配置的 retention 上限时只淘汰最旧事件。

#### Scenario: Record proposal and operation transitions

- **WHEN** 当前 session 执行 prepare、confirm、patch/verification/commit/landing 的实际状态转移或 release 成功
- **THEN** 系统 SHALL 追加对应 phase 的事件，并保留转移后的 status、operationStatus、executionStatus 和脱敏 reason

#### Scenario: Record blocked, interrupted, and uncertain outcomes

- **WHEN** 既有 lifecycle 操作实际转移为 blocked/interrupted 或记录 `patch-application-unknown`、`commit-creation-unknown`、`landing-creation-unknown`
- **THEN** 系统 SHALL 追加事件，但不得把结果升级为 applied、created、landed 或未执行

#### Scenario: Enforce in-memory retention

- **WHEN** 单个 proposal 的事件数超过正整数 retention 上限
- **THEN** 系统 SHALL 只保留不超过上限的最近事件，且 MUST 不写入 workspace、磁盘、数据库或远程服务

### Requirement: The system SHALL expose a bounded read-only history action

系统 MUST 提供 `history` action，接收当前 session 的已知 `proposalId` 和可选正的 safe-integer `limit`，默认最多返回 50 条、上限 100 条。返回 MUST 按时间线顺序返回最近的 retained events，并包含 `total`、`returned`、`truncated` 和 `sessionOnly=true`。返回事件 MUST 是 detached snapshot。

#### Scenario: Read a proposal history

- **WHEN** 调用方使用已知 proposalId 执行 history
- **THEN** 系统 SHALL 返回 available 的 bounded events，且不得访问 source workspace、worktree、Git、approval、Goal、sandbox、subprocess 或 network

#### Scenario: History limit truncates retained events

- **WHEN** retained event 数量大于请求的合法 limit
- **THEN** 系统 SHALL 返回最近 limit 条、保持 chronological order，并将 `truncated` 设为 true

#### Scenario: Empty history is available

- **WHEN** proposal 已知但没有 retained event
- **THEN** 系统 SHALL 返回 available、空 events、total=0、returned=0、truncated=false

### Requirement: The system SHALL fail closed and preserve observation boundaries

缺少/未知 proposalId 或 limit 为 0、负数、小数、非 safe integer 或超过 100 时，history MUST 返回 blocked 与空 events，不得泄露 registry 内容或调用 adapter。`inspect`、`list`、`inspect-live`、`review-patch`、`export-patch` 以及未造成状态变更的 digest mismatch/approval denial MUST 不追加事件。

#### Scenario: Unknown proposal or invalid limit is denied

- **WHEN** 调用方使用未知 proposalId、缺少 proposalId 或非法 limit 执行 history
- **THEN** 系统 SHALL fail closed，返回空 events，且不调用 source/worktree inspection、mutation Git、approval、Goal、sandbox、subprocess 或 network

#### Scenario: Read-only and no-transition calls do not append

- **WHEN** 调用方重复执行 inspect/list/inspect-live/review/export、digest mismatch 或被拒绝且 draft 仍 pending 的操作
- **THEN** 系统 SHALL 保持 history 内容和顺序不变

#### Scenario: History result is isolated

- **WHEN** 调用方修改 history result 中的 event、executionStatus 或 reason 后再次查询
- **THEN** 系统 SHALL 返回未被修改的 retained snapshot
