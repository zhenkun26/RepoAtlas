# bounded-patch-application Specification

## Purpose
为 RepoAtlas v2 的隔离变更提案增加一个受边界、session-only 且必须二次确认的补丁草稿与应用流程。RepoAtlas 只接收用户或宿主显式提供的有界 unified diff，不从自然语言意图自动生成源码；补丁只能应用到当前 session 自己创建的干净隔离 worktree。
## Requirements
### Requirement: The system SHALL prepare patches only for confirmed session-owned proposals

补丁草稿 MUST 绑定当前 session 中 status=confirmed 的 proposal、记录的 base revision、worktree identity 和已确认目标。`prepare-patch` MUST 接收用户或宿主显式提供的 bounded unified diff；系统 MUST NOT 根据 intent、evidence 或仓库扫描结果自行合成源码补丁。准备阶段不得写入 source workspace 或 proposal worktree。

#### Scenario: A valid patch draft is prepared without mutation

- **WHEN** 用户为当前 session 的 confirmed proposal 提供有界 unified diff，且 proposal worktree identity、base revision 和 clean 状态均匹配
- **THEN** 系统 SHALL 返回唯一 patch draft id、patch digest、有限的文件/操作/hunk 摘要和 patch state=awaiting-confirmation，且 SHALL 不调用 Git apply、不写入 source workspace 或 worktree

#### Scenario: An unavailable or unconfirmed proposal is rejected

- **WHEN** patch 请求指向未知 proposal、未 confirmed 的 proposal、非当前 session 的 proposal、已释放的 worktree 或缺少 patch text
- **THEN** 系统 SHALL 返回 bounded blocked result，且 SHALL 不读取新的仓库内容、不调用 Git apply、不产生文件写入

### Requirement: The system SHALL enforce patch grammar, target, content, and resource bounds

补丁 MUST 只包含 regular-file 的 add、modify、delete unified diff。每个路径 MUST 是 workspace-relative、规范化后不越界、不命中 sensitive/excluded policy、在确认的 GoalSpec scope 内，并且 MUST 出现在原 proposal 的 confirmed targets 中且 operation 完全匹配。系统 MUST 拒绝 binary、rename/copy、file-mode、submodule、绝对路径、路径逃逸和未声明目标。patch bytes、文件数、hunk 数、单行长度、摘要字节数和 secret-like 内容 MUST 受限。

#### Scenario: A patch target escapes or exceeds the proposal boundary

- **WHEN** patch header 包含绝对路径、`..` 逃逸、敏感/排除路径、scope 外路径、proposal 未确认路径或 operation 不匹配
- **THEN** 系统 SHALL 拒绝整个 patch draft，返回 bounded reason，且 SHALL 不保留可应用的 patch draft、不调用 Git apply

#### Scenario: A patch uses unsupported or over-budget content

- **WHEN** patch 包含 binary/rename/mode/submodule 变更、超出任一 patch budget 或被 secret-like content policy 命中
- **THEN** 系统 SHALL 返回 blocked 或 uncovered limitation，且 SHALL 不把该内容重写、脱敏后继续应用或写入任何 workspace

#### Scenario: A bounded patch contains only declared targets

- **WHEN** patch 的所有 regular-file 操作都在 proposal confirmed targets 内，路径和 operation 匹配，且所有预算与内容策略通过
- **THEN** 系统 SHALL 生成 session-only patch draft descriptor，并 SHALL 返回 canonical summary 与 confirmation digest，而不暴露或持久化超出摘要所需的完整源码内容

### Requirement: The system SHALL require an exact second confirmation before applying a patch

应用 MUST 要求未过期 patch draft id 和完全匹配的 patch confirmation digest。digest MUST 绑定 proposal id、原 proposal digest、base revision、worktree identity、canonical patch bytes 和 normalized summary。digest 不匹配、proposal/worktree revision 变化、worktree 变 dirty、draft 过期或 AbortSignal 已中止时 MUST fail closed，且 MUST 不调用 Git apply。

#### Scenario: Matching confirmation applies to the isolated worktree

- **WHEN** 用户确认未过期 patch draft 的 exact digest，且实时 worktree identity/base revision 匹配并保持 clean
- **THEN** 系统 SHALL 只对该 session-owned detached worktree 执行固定本地 patch apply，返回 patch state=applied、operationStatus=patch-applied 和 patch/commit/push execution status，其中 commit MUST remain commit-not-created 且 push MUST remain push-not-performed

#### Scenario: A mismatch or replay does not apply twice

- **WHEN** 用户提供错误 digest，或对已 applied/rejected/blocked/interrupted 的 patch draft 重放确认
- **THEN** 错误 digest SHALL 保持 awaiting-confirmation 且不写入；terminal/replayed draft SHALL 返回已有状态且 Git apply 调用次数不得增加

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

### Requirement: The system SHALL preserve explicit non-force cleanup after patch application

应用后的 dirty worktree MUST 不能被 release 自动删除。release MUST 继续校验当前 session ownership、identity 和 clean 状态；unowned、identity mismatch、dirty 或无法检查的 worktree MUST 被拒绝并保留路径。系统 MUST 不隐式执行逆补丁、`git clean`、force remove 或其他可能丢失用户审阅改动的操作。

#### Scenario: An applied dirty worktree is retained for review

- **WHEN** 用户对已应用补丁的 dirty worktree 请求 release
- **THEN** 系统 SHALL 返回 blocked 并说明需要用户审阅/清理，remove 调用次数 MUST 为零，worktree 路径和 patch state MUST 保留在当前 session result 中

#### Scenario: A manually cleaned owned worktree can use the existing safe release

- **WHEN** 用户在系统外清理已审阅 worktree，且当前 session registry 中 identity 仍匹配、worktree clean
- **THEN** 既有 release SHALL 通过固定本地 Git remove 释放它，并 SHALL 不影响 source workspace、其他 session 或未拥有的 worktree
