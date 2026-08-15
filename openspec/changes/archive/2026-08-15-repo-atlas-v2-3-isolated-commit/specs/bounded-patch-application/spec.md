## MODIFIED Requirements

### Requirement: The system SHALL keep patch application local and source-isolated

补丁应用 MUST 使用固定本地 Git 操作、`shell:false` 和受限参数；不得访问 remote/network，不得执行任意 shell，不得使用 `--reject`、`--3way`、`--index` 或等价的隐式合并/强制选项。source workspace MUST 保持不变，且 patch application operation 本身 MUST 不创建 commit 或 push；任何后续 commit MUST 通过独立的 isolated-worktree-commit 流程显式执行。

#### Scenario: Applying a patch does not copy or alter source changes

- **WHEN** source workspace 在 proposal 创建后存在未提交改动，用户确认一个合法 patch 并应用
- **THEN** 系统 SHALL 只修改隔离 worktree，source workspace 的文件和未提交改动 MUST 保持原样，且 worktree MUST 基于记录的 base revision

#### Scenario: A requested external or arbitrary action is rejected

- **WHEN** patch request 包含 remote URL、任意 command、commit、push、deployment、dependency install 或 source workspace target
- **THEN** 系统 SHALL 返回 blocked，保持 patch draft 未应用或 blocked 状态，并 SHALL 不执行该动作；显式 commit 只能由 isolated-worktree-commit 流程单独触发

### Requirement: The system SHALL report patch application and ambiguity without overstating success

结果 MUST 返回 patch draft id、proposal id、base revision、worktree identity、canonical target summary、evidence ids、limits/limitations、risk、patch digest、patch state 和 execution status。Git apply 后系统 MUST 检查变更路径仍限制在 patch targets 内；若 apply 被中止、失败或 postcondition 无法确认，系统 MUST 返回 blocked/interrupted 与 patch-application-unknown（如存在潜在写入），不得声称 patch-not-applied 或 patch-applied。patch application result MUST 保持 commit-not-created，直到独立 commit 流程成功返回 commit-created。

#### Scenario: A successful apply is auditable but non-committing

- **WHEN** Git apply 成功且 postcondition 检查确认仅声明目标发生变化
- **THEN** 系统 SHALL 明确返回 patch-applied，并 SHALL 同时标记 commit-not-created、push-not-performed，且 MUST 不声称 proposal 已提交或已发布

#### Scenario: Apply interruption or postcondition failure is fail-closed

- **WHEN** AbortSignal 中止 Git apply，Git 返回失败，或结果无法证明变更路径与 patch summary 一致
- **THEN** 系统 SHALL 保留 worktree 路径，返回 interrupted 或 blocked 及 patch-application-unknown（若不能证明未写入），并 SHALL 不 force rollback 或 force delete
