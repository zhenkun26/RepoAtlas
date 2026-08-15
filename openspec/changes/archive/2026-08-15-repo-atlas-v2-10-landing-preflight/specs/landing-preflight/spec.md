# landing-preflight Specification

## ADDED Requirements

### Requirement: The system SHALL expose a bounded read-only landing relation

系统 MUST 提供 `inspect-landing` action，接收当前 session 中已知的 `proposalId`，并从 proposal registry 派生 source workspace、记录的 base revision、session-owned worktree identity 和已创建 commit revision。系统 MUST 只使用固定本地 Git read-only inspection，返回 detached 的 `ChangeProposalResult` 与 landing assessment；该 assessment MUST 标记 `sessionOnly=true`，不得包含 absolute paths、patch text、digest、command 或 approval data。

#### Scenario: Inspect a proposal before a local commit exists

- **WHEN** proposal 已知但尚未创建 session-local commit
- **THEN** 系统 SHALL 返回 status=`available`、relation=`not-applicable` 的 bounded assessment，不调用 target/ancestry mutation 或创建 worktree

#### Scenario: Inspect a fast-forwardable local commit

- **WHEN** source repository/path identity、source cleanliness、记录的 base revision、target commit 和 source-to-target ancestry 均被本地 inspection 确认，且 source HEAD 是 target 的 ancestor
- **THEN** 系统 SHALL 返回 relation=`fast-forwardable`，但 MUST 明确 landing 尚未执行且不得修改 source、index、worktree 或 lifecycle state

#### Scenario: Distinguish already-landed and non-linear relations

- **WHEN** source HEAD 等于 target、target 是 source 的 ancestor、或两者互不为 ancestor
- **THEN** 系统 SHALL 分别返回 `already-landed`、`source-ahead` 或 `diverged`，不得把这些观察伪装成 landing 成功或授权

### Requirement: The system SHALL fail safe for dirty, drifted, and uncertain source state

source dirty、source HEAD 与 proposal base revision 不匹配、source identity/path/repository 无法确认、target revision 不可解析、ancestry command 失败或 AbortSignal 中止时，系统 MUST 返回 dirty/drift/source-ahead/unknown/target-unavailable bounded observation，不得返回 `fast-forwardable` 或把观察结果表述为 landing 已完成，不得变更 proposal、nested execution status 或 lifecycle history。source-ahead MAY accompany `baseRevisionMatches=false` because it only means the target is already contained by source, not that landing is authorized.

#### Scenario: Dirty or drifted source is not landing-ready

- **WHEN** source 有未提交改动，或 source HEAD 不等于 proposal 记录的 base revision
- **THEN** 系统 SHALL 优先返回 relation=`source-dirty` 或 `source-revision-drift`，保留对应 clean/baseRevisionMatches facts，不执行 landing 或 cleanup

#### Scenario: Unknown Git facts remain unknown

- **WHEN** source inspection、target verification 或 ancestry inspection 失败
- **THEN** 系统 SHALL 返回 status=`unknown` 及 bounded reason，且不得猜测 landing 关系或调用任何 mutation action

### Requirement: The system SHALL preserve session-only, fail-closed, and no-mutation boundaries

`inspect-landing` MUST 对缺少/未知 proposalId fail closed，未知 proposal 不得调用 adapter。已知 proposal 的 inspection MUST 只调用 fixed local read-only adapter methods，不得调用 commit、land、remove、patch、approval、Goal、sandbox、network 或 filesystem persistence。重复调用 MUST 不追加 event、不修改 registry、不创建或删除 worktree，并返回与未变化本地事实一致的 detached snapshot。

#### Scenario: Unknown proposal is denied before adapter access

- **WHEN** 调用方省略或提供未知 proposalId
- **THEN** 系统 SHALL 返回 blocked、无 assessment，且所有 Git inspection/mutation counters 保持不变

#### Scenario: Preflight is not execution

- **WHEN** 调用方获得任一 landing relation
- **THEN** 系统 SHALL 保留 proposal 的非执行语义，明确 landing 未由该 action 执行，并不授予后续 landing/merge/cleanup 权限
