# isolated-change-proposals Specification

## Purpose
为用户提供一个与原始 workspace 隔离的、可审阅且必须显式确认的代码变更提案流程，让 RepoAtlas 能安全承接分析后的下一步探索，同时不把提案误认为已执行的代码修改。
## Requirements
### Requirement: The system SHALL create proposals only from a confirmed session and explicit user request

变更提案 MUST 绑定当前 session、workspace root、当前基准 revision 和已确认的 GoalSpec；提案输入 MUST 来自用户明确提供的变更意图、目标路径或操作描述。仓库文本、证据内容和工具输出 MUST 不能单独触发提案或构成授权。

#### Scenario: A valid request creates a pending proposal
- **WHEN** 用户提供已确认分析 session 的 id、变更意图和有界目标路径，但未确认生成隔离工作树
- **THEN** 系统 SHALL 返回唯一 proposal id、内容摘要和 confirmation digest，状态为 awaiting-confirmation，且 SHALL 不创建工作树或修改任何 workspace 文件

#### Scenario: Unconfirmed or unknown session is rejected
- **WHEN** 请求没有确认的 GoalSpec，或 session id 不属于当前 session store
- **THEN** 系统 SHALL 拒绝创建提案，说明缺少确认或 session 不可用，且 SHALL 不读取新的仓库内容或产生外部副作用

### Requirement: The system SHALL enforce path, operation, and resource bounds

提案 MUST 只接受 workspace 内的相对路径和预定义的 add、modify、delete 操作描述；规范化后越界、指向敏感路径、超出确认 scope、重复或超过提案预算的目标 MUST 被拒绝或标记为 uncovered。提案 MUST 记录受影响路径、操作、理由和有限风险摘要，不得嵌入完整源码或秘密原文。

#### Scenario: An out-of-scope path is requested
- **WHEN** 用户请求的路径经过规范化后位于 workspace 外、包含路径逃逸、命中敏感策略或不在已确认 scope 内
- **THEN** 系统 SHALL 不把该路径列为可执行目标，并 SHALL 返回 bounded rejection 或 uncovered 状态及原因

#### Scenario: Proposal budget is reached
- **WHEN** 目标路径、操作描述、摘要字节数或证据引用数量达到配置上限
- **THEN** 系统 SHALL 停止接收新增提案项，保留已验证的部分结果，并 SHALL 标记未覆盖范围为 budget-exhausted

### Requirement: The system SHALL require digest-bound confirmation before worktree creation

系统 MUST 在创建独立工作树前要求用户回传未过期 proposal id 和完全匹配的 confirmation digest；确认 MUST 明确表示同意目标 workspace、基准 revision、目标路径、操作描述和创建隔离工作树。缺少确认、digest 不匹配、proposal 已过期或 signal 已中止时 MUST fail closed。

#### Scenario: Matching confirmation creates an isolated worktree
- **WHEN** 用户确认未过期 proposal 的 digest，且目标 workspace 是有效 Git repository
- **THEN** 系统 SHALL 基于记录的基准 revision 创建 detached worktree 到 workspace 外的临时路径，并 SHALL 返回 worktree 路径、base revision 和 proposal status=confirmed

#### Scenario: Confirmation mismatch does not create a worktree
- **WHEN** proposal id、digest、base revision 或目标摘要与待确认提案不匹配
- **THEN** 系统 SHALL 拒绝确认，保留原始 workspace 不变，并 SHALL 不调用 Git worktree 创建动作

### Requirement: The system SHALL keep proposal execution isolated and local

提案流程 MUST 不向原始 workspace 写入、删除或重命名文件，不得把未提交改动自动复制到隔离工作树，不得访问网络或远程 Git 端点。工作树创建只允许使用固定的本地 Git 操作；提案内容和关联 evidence MUST 只保存在当前 session memory 中。

#### Scenario: The source workspace has local changes
- **WHEN** 用户确认基于当前 HEAD 创建提案，而原始 workspace 存在未提交改动
- **THEN** 系统 SHALL 保留这些改动不变，并 SHALL 从记录的 HEAD revision 创建隔离工作树，不得隐式复制或覆盖未提交内容

#### Scenario: A network or arbitrary command is requested
- **WHEN** 提案请求包含远程 URL、任意 shell 命令、依赖安装、提交、推送或部署动作
- **THEN** 系统 SHALL 拒绝该动作，并 SHALL 将提案保持在未执行或 blocked 状态

### Requirement: The system SHALL return an auditable, non-executed proposal result

确认后的结果 MUST 明确区分 proposal、worktree-created、patch-not-applied、commit-not-created 和 push-not-performed 状态，并 SHALL 返回 base revision、worktree identity、目标操作、evidence ids、预算/未覆盖范围、风险和 abort 状态。系统 MUST 不声称代码修改已经完成。

#### Scenario: Confirmed proposal is reported as not applied
- **WHEN** 隔离工作树创建成功但没有执行补丁写入、提交或推送
- **THEN** 系统 SHALL 返回可审阅的结构化提案，并 SHALL 明确标记 patch-not-applied、commit-not-created 和 push-not-performed

#### Scenario: Worktree creation is interrupted or fails
- **WHEN** Git worktree 创建被 AbortSignal 中止、仓库无 HEAD、路径不安全或 Git 返回失败
- **THEN** 系统 SHALL 返回 bounded failure，保留原始 workspace 不变，并 SHALL 不伪造 confirmed 或 applied 状态

### Requirement: The system SHALL release only its own session worktrees on explicit request

系统 MUST 只允许用户显式请求释放当前 session 创建且仍由 proposal registry 记录的 worktree；释放前 MUST 校验 worktree identity，且不得使用会静默丢弃用户改动的强制删除。释放失败时 MUST 保留记录并说明原因。

#### Scenario: An owned clean worktree is released
- **WHEN** 用户明确请求释放当前 session 的已记录 worktree，且 worktree identity 匹配并没有未提交改动
- **THEN** 系统 SHALL 通过固定本地 Git 操作释放该 worktree，并 SHALL 将 proposal 标记为 released

#### Scenario: An unowned or dirty worktree cannot be released automatically
- **WHEN** 请求指向未由当前 session 创建的路径，或被管理 worktree 存在未提交改动
- **THEN** 系统 SHALL 拒绝自动释放，不得使用 force 删除，并 SHALL 返回保留路径和安全原因

### Requirement: The system SHALL bind proposal ownership to one live Harness session

The proposal manager used for analysis registration and every proposal lifecycle action MUST belong to the exact calling Harness session. An internal analysis session id, proposal id, patch id, commit id, or landing id MUST be treated as unknown outside that owner session even when another session uses the same workspace.

#### Scenario: Another session submits an owned lifecycle id
- **WHEN** a sibling Harness session submits any lifecycle id created by the owner session
- **THEN** the operation SHALL fail closed before adapter access, approval, Git, sandbox, subprocess, or mutation and SHALL not disclose owner-session details

#### Scenario: Owner session continues its lifecycle
- **WHEN** the original Harness session submits an id from its own in-memory registry
- **THEN** existing digest, expiry, Goal, approval, identity, and postcondition gates SHALL continue to apply within that session
