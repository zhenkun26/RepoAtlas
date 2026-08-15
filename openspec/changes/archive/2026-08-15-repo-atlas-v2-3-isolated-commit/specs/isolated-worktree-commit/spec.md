## Purpose

为已验证的隔离补丁提供一个必须显式确认、受路径和消息边界约束且只产生本地 detached-worktree commit 的可审计交付步骤，同时保持源 workspace 和远程仓库不变。

## ADDED Requirements

### Requirement: The system SHALL prepare commits only for passed verified patches

commit draft MUST 绑定当前 session 中 status=confirmed 的 proposal、已 applied 的 patch、verification status=passed、记录的 worktree identity/base revision 和 patch declared paths。`prepare-commit` MUST 接收调用方显式提供的非空 bounded commit message，拒绝超预算或 secret-like 内容；准备阶段不得写入 Git index、worktree、source workspace 或 remote。

#### Scenario: A valid commit draft is prepared without a Git mutation
- **WHEN** 当前 session 的 confirmed proposal 中存在 applied patch，verification=passed，worktree clean-state 之外的 changed paths 仅包含 patch targets，且调用方提供合法 commit message
- **THEN** 系统 SHALL 返回唯一 commit draft id、commit confirmation digest、消息摘要和 status=awaiting-confirmation，且 SHALL 不执行 Git add、commit、reset 或 push

#### Scenario: An unverified or unavailable patch cannot prepare a commit
- **WHEN** proposal/worktree 未 confirmed、patch 未 applied、verification 不是 passed、identity/base revision 不匹配、存在未声明 changed path、worktree 无法检查或 commit message 无效
- **THEN** 系统 SHALL 返回 bounded blocked result，且 SHALL 不创建 commit draft 或修改任何 Git 状态

### Requirement: The system SHALL require exact commit confirmation and host approval

commit MUST 要求未过期 commit draft id、完全匹配的 confirmation digest 和 Harness host active+armed Goal 与一次性 `allowed-once` approval。digest MUST 绑定 proposal id、patch digest、verification id/status、base revision、worktree identity、declared paths 和 normalized commit message。错误 digest、replay、proposal/worktree 变化或 AbortSignal 中止时 MUST fail closed，且不得调用 Git commit。

#### Scenario: Matching confirmation creates one isolated local commit
- **WHEN** 用户确认 exact digest，host Goal/approval 通过，实时 worktree identity/base revision 匹配，且 changed paths exactly match patch targets
- **THEN** 系统 SHALL 只在该 session-owned detached worktree 创建一个 commit，返回 status=created、commit revision、commit-created 和 push-not-performed，source workspace MUST 保持不变

#### Scenario: Mismatch, rejection, or replay never commits twice
- **WHEN** 用户提供错误 digest，拒绝 commit draft，或对 created/rejected/blocked/interrupted draft 重放确认
- **THEN** 系统 SHALL 保持 awaiting-confirmation 或返回既有 terminal result，Git commit 调用次数 MUST 不增加

### Requirement: The system SHALL use fixed local path-limited commit behavior

commit MUST 只对 patch summary 中声明的 repository-relative paths 执行 staging，并 MUST 先确认 staged path set 与声明集合完全一致。Git 操作 MUST 使用 `shell:false`、固定本地参数、`--no-verify` 和 `--no-gpg-sign`；系统 MUST 不接受任意 option、remote、author、hook、amend、branch、merge、push 或 Shell 输入。

#### Scenario: Source changes and undeclared paths are not included
- **WHEN** source workspace 在 proposal 生命周期中存在未提交改动，或 isolated worktree 在 confirm 前出现未声明 changed path
- **THEN** commit MUST 被 blocked，且 SHALL 不 stage、commit、修改 source workspace 或影响其他 worktree

#### Scenario: Commit request cannot expand to remote or arbitrary Git behavior
- **WHEN** commit input 包含 remote URL、push、merge、任意 command、Git option、author 或 hook 请求
- **THEN** 系统 SHALL 返回 blocked，保持 commit draft 未创建或 awaiting-confirmation，且 SHALL 不执行该动作

### Requirement: The system SHALL report commit success and ambiguity without unsafe cleanup

成功 commit MUST 返回 commit id、proposal/patch/commit ids、base revision、worktree identity、commit message digest、approval audit id、commit execution status 和 push-not-performed。Git 返回失败、被中止、超时或 postcondition 无法证明时，系统 MUST 返回 commit-not-created 或 commit-creation-unknown；不得声称成功或未创建，并 MUST 保留 worktree，不执行 reset、unstage、git clean、逆补丁或 force remove。成功 commit 后 worktree MUST clean，既有 safe release MAY 释放它。

#### Scenario: Successful commit is a local non-pushing result
- **WHEN** fixed Git staging set matches targets、commit 成功并且 postcondition 证明 worktree clean、HEAD revision 可读
- **THEN** 系统 SHALL 返回 commit-created、push-not-performed，且 SHALL 不声称 source workspace 已落地或远程已发布

#### Scenario: Commit uncertainty retains the worktree
- **WHEN** Git commit 失败、AbortSignal 中止、进程结果不确定或 postcondition inspection 失败
- **THEN** 系统 SHALL 返回 blocked/interrupted 与 commit-creation-unknown（若无法证明未写入），保留 worktree 路径，并 SHALL 拒绝 force cleanup
