# source-workspace-landing Specification
## Purpose
为已在当前 session 的 detached worktree 中创建并验证通过的 commit 提供一个必须显式确认、仅允许 clean exact-base fast-forward 的 source workspace landing 步骤，同时禁止冲突解决、远程 Git 和自动恢复。
## Requirements
### Requirement: The system SHALL prepare landing only for an exact created commit and clean source

landing draft MUST 绑定当前 session 中 `status=confirmed` 的 proposal、`commit.status=created`、`commit.executionStatus=commit-created`、commit revision、source workspace path 和 proposal base revision。prepare MUST 实时检查 source workspace clean、repository root 匹配且 `HEAD === baseRevision`；准备阶段不得修改 source workspace、isolated worktree、index 或 remote。

#### Scenario: A valid landing draft is prepared without source mutation

- **WHEN** 当前 session 的 confirmed proposal 拥有 created commit，source workspace clean 且 HEAD 等于记录的 base revision
- **THEN** 系统 SHALL 返回唯一 landing id、landing confirmation digest 和 `status=awaiting-confirmation`，且 source HEAD、index、worktree 和 remote SHALL 不变

#### Scenario: Missing commit or unsafe source cannot prepare landing

- **WHEN** commit 未创建、commit result unknown、source dirty、source HEAD 漂移、repository root 不匹配、source inspection 失败或 proposal/worktree 不可用
- **THEN** 系统 SHALL 返回 bounded blocked result，不创建 landing draft，不执行 Git landing

### Requirement: The system SHALL require exact landing confirmation and host approval

confirm MUST 要求未过期 landing draft、完全匹配 digest、active+armed Harness Goal 和一次性 `allowed-once` approval。digest MUST 绑定 proposal id、commit id/revision、source path、source base revision 和 target revision。错误 digest、拒绝、replay 或 AbortSignal MUST fail closed，且不得执行 source Git 操作。

#### Scenario: Matching confirmation lands one local commit

- **WHEN** 用户确认 exact digest，host approval 通过，source 实时 clean 且 HEAD 仍等于 base revision，target commit 可在本地解析
- **THEN** 系统 SHALL 只执行一次固定 fast-forward landing，返回 `status=landed`、`landing-completed`、source revision 等于 commit revision 和 `push-not-performed`，不访问 remote

#### Scenario: Rejection, expiry, mismatch, or replay never lands twice

- **WHEN** 用户拒绝 landing draft、draft 过期、digest 错误或对 landed/rejected/blocked/interrupted draft 重放 confirm
- **THEN** 系统 SHALL 保持 pending 或返回既有 terminal result，source landing 调用次数 MUST 不增加

### Requirement: The system SHALL use fixed fast-forward-only local Git behavior

land MUST 使用 `shell:false` 和固定参数 `merge --ff-only --no-verify --no-edit <recordedCommitRevision>`，并 MUST 在 adapter 内重新验证 source repository root、clean status、expected HEAD 和 locally resolvable target revision。系统 MUST 不接受任意 command、option、remote、branch、merge strategy、conflict input 或 user-supplied path。

#### Scenario: Source changes are never silently overwritten

- **WHEN** source workspace 在 confirm 前产生 staged、unstaged 或 untracked changes，或 source HEAD 不再是 proposal base revision
- **THEN** landing MUST 被 blocked，且 source 内容、index 和 commit history SHALL 不被修改

#### Scenario: Non-fast-forward history is rejected

- **WHEN** source HEAD 与 recorded base revision 不一致或 target commit 不能 fast-forward 当前 source HEAD
- **THEN** landing MUST 返回 blocked 或 `landing-not-performed`，不得创建 merge commit、修改 branch 或执行冲突解决

### Requirement: The system SHALL report landing success and ambiguity without automatic cleanup

成功 landing MUST 返回 proposal/commit/landing ids、source path、base revision、landed revision、approval audit id、landing execution status 和 `push-not-performed`。Git 失败、中止、超时或 postcondition 无法证明时，系统 MUST 返回 `landing-not-performed` 或 `landing-creation-unknown`，保留 source/worktree，不执行 reset、revert、clean、逆补丁或 force remove。

#### Scenario: Successful landing has a provable clean postcondition

- **WHEN** fixed fast-forward completes and source inspection proves repository/path identity unchanged, source HEAD equals target commit revision, and source is clean
- **THEN** 系统 SHALL 返回 `landed` 与 `landing-completed`，并允许后续 safe release 处理干净的 isolated worktree

#### Scenario: Landing uncertainty retains both workspaces

- **WHEN** merge process is interrupted, process result is uncertain, or source postcondition inspection fails
- **THEN** 系统 SHALL 返回 blocked/interrupted 与 `landing-creation-unknown`，不得声称 landed 或未 landed，且 SHALL 保留 source workspace 和 isolated worktree
