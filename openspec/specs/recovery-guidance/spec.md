# recovery-guidance Specification

## Purpose
TBD - created by archiving change repo-atlas-v2-9-recovery-guidance. Update Purpose after archive.
## Requirements
### Requirement: The system SHALL expose bounded read-only recovery guidance

系统 MUST 提供 `inspect-recovery` action，接收当前 session 中的 `proposalId`，并仅根据 proposal registry 返回 bounded、detached 的 proposal summary、recommendation、有限 allowedActions、reason、`manualReviewRequired` 和 `sessionOnly=true`。recommendation MUST 只能使用既有 lifecycle action 名称或 `manual-review-required`/`no-action`，不得表示 recovery 已执行或授权已授予。

#### Scenario: Guide a pending proposal

- **WHEN** proposal 处于 `awaiting-confirmation` 且没有 nested execution uncertainty
- **THEN** 系统 SHALL 返回 recommendation=`confirm`、allowedActions 包含 `confirm` 和 `reject`，且不得创建 worktree 或改变 proposal

#### Scenario: Guide an ordinary next lifecycle step

- **WHEN** proposal 处于 confirmed/no-patch、patch-awaiting-confirmation、patch-applied/unverified、verification-passed/no-commit、commit-awaiting-confirmation、commit-created/no-landing 或 landing-awaiting-confirmation
- **THEN** 系统 SHALL 按 decision table 返回对应下一 action 与有限 allowedActions，且 MUST 不调用 Git、live inspection 或 approval

#### Scenario: Guide safe release only for registry-safe states

- **WHEN** proposal 是 confirmed 且没有 dirty/unknown execution implication，或已有 clean local commit/landing draft 可释放
- **THEN** guidance MAY include `release`; guidance MUST NOT 将 applied dirty patch、commit/landing uncertain 或其他未知 worktree 状态推荐为 release

### Requirement: The system SHALL require manual review for uncertain and terminal states

如果 proposal 或 nested patch/commit/landing execution status 为 `patch-application-unknown`、`commit-creation-unknown`、`landing-creation-unknown`、blocked、interrupted 或其他无法证明安全继续的终止状态，系统 MUST 返回 recommendation=`manual-review-required`、`manualReviewRequired=true` 和空 allowedActions。rejected/released 等已明确完成且无后续动作的状态 MUST 返回 `no-action`。

#### Scenario: Uncertain commit or landing is not auto-recovered

- **WHEN** registry 包含 `commit-creation-unknown` 或 `landing-creation-unknown`
- **THEN** guidance SHALL 只要求人工复核，不得建议 release、confirm、prepare-landing、reset、revert、merge、cleanup 或其他执行动作

#### Scenario: Blocked or interrupted proposal is fail-safe

- **WHEN** proposal status 为 blocked/interrupted，或 nested operation 已 blocked/interrupted 且不能证明安全继续
- **THEN** guidance SHALL 返回 manual-review-required 与空 allowedActions，不得修改 lifecycle 或追加 event

#### Scenario: Rejected or released proposal is terminal

- **WHEN** proposal status 为 rejected 或 released 且没有未决可执行 operation
- **THEN** guidance SHALL 返回 recommendation=`no-action`、manualReviewRequired=false 和空 allowedActions

### Requirement: The system SHALL preserve session-only and fail-closed boundaries

`inspect-recovery` MUST 只读取当前 manager memory，不得访问 source workspace、worktree、Git、history、approval、Goal、sandbox、subprocess、network 或 filesystem。缺少、空值或未知 proposalId MUST 返回 blocked 且不暴露 summary。guidance 结果 MUST 与 registry 隔离，重复查询 MUST 不改变 proposal、event history 或 counters。

#### Scenario: Unknown proposal is denied

- **WHEN** 调用方省略或提供当前 session 未知的 proposalId
- **THEN** 系统 SHALL 返回 blocked、无 guidance，且不得调用任何 adapter/approval/Goal/subprocess 能力

#### Scenario: Guidance is read-only and detached

- **WHEN** 调用方重复查询 guidance，或修改返回的 summary、allowedActions、reason 后再次查询
- **THEN** 系统 SHALL 返回相同 registry-derived guidance，且既有 lifecycle event history 与 Git counters 保持不变
