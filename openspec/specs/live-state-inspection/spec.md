# live-state-inspection Specification

## Purpose
TBD - created by archiving change repo-atlas-v2-7-live-state-inspection. Update Purpose after archive.
## Requirements
### Requirement: The system SHALL expose bounded read-only live observations

系统 MUST 提供 `inspect-live` action，按当前 session 中已知 `proposalId` 派生 source workspace 和 managed worktree 的 inspection 参数，并返回现有 `ChangeProposalResult` 加 bounded live observation。source observation MUST 包含 clean、revision、baseRevisionMatches、repositoryRootMatches 和 workspacePathMatches；worktree observation MUST 包含 clean、baseRevision、baseRevisionMatches、identityMatches 和 changedPathCount。系统 MUST 不返回 absolute paths 或 changed path names。

#### Scenario: Inspect a proposal with source and worktree

- **WHEN** 当前 proposal 已有 session-owned worktree，且 source/worktree 的只读 Git inspection 均成功
- **THEN** 系统 SHALL 返回 live status=available、两侧 observation 和 checkedAt，且 proposal 的 lifecycle/execution 状态保持不变

#### Scenario: Inspect a proposal before worktree creation

- **WHEN** 当前 proposal 仍 awaiting-confirmation 且 source inspection 成功
- **THEN** 系统 SHALL 返回 source observation、live status=available 与 worktree status=not-applicable，不得伪造 worktree observation 或创建 worktree

#### Scenario: Live observation preserves dirty and mismatch facts

- **WHEN** source 或 worktree 是 dirty，或 revision/identity/repository/path 与 proposal 记录不匹配
- **THEN** 系统 SHALL 返回对应 false/count facts，且不得将 proposal 标记为 blocked、created、landed、applied 或 pushed

### Requirement: The system SHALL distinguish partial and unknown inspection results

source 与 worktree 检查均可失败。两侧都成功时 overall live status MUST 为 available；仅一侧成功时 MUST 为 partial；所有已尝试检查失败时 MUST 为 unknown。错误 reason MUST bounded/redacted，且 MUST 保留原 proposal snapshot。

#### Scenario: One inspection side fails

- **WHEN** source 或 managed worktree inspection 之一抛出错误而另一侧成功
- **THEN** 系统 SHALL 返回 live status=partial、成功侧 observation 和失败侧 bounded reason，不执行任何 recovery 或 lifecycle transition

#### Scenario: All inspection attempts fail or abort

- **WHEN** source/worktree inspection 均失败，或 AbortSignal 在 inspection 前/中止执行
- **THEN** 系统 SHALL 返回 live status=unknown 或 interrupted observation，不得声称 live state 已确认，且不得修改 registry

### Requirement: The system SHALL keep live inspection session-only and side-effect free

`inspect-live` MUST 只调用固定本地 read-only adapter inspection。unknown/empty proposal id MUST fail closed，不调用 adapter。该 action MUST 不请求 Harness approval、Goal、sandbox、subprocess，不访问网络，不写 source/worktree/index/磁盘，不执行 mutation Git 操作，不持久化或跨 session。

#### Scenario: Unknown proposal is denied before adapter access

- **WHEN** 调用方使用未知或缺失 proposal id 执行 `inspect-live`
- **THEN** 系统 SHALL 返回 blocked 且不调用 source/worktree inspection、approval、Git mutation 或 subprocess

#### Scenario: Live inspection does not repair uncertain states

- **WHEN** proposal registry 已记录 `commit-creation-unknown` 或 `landing-creation-unknown`
- **THEN** 系统 SHALL 只返回独立 live observation，保留原 execution status 和非执行语义，不将其升级为 created/landed 或未执行
