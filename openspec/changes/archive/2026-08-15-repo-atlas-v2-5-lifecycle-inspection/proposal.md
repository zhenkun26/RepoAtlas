# v2.5 Session-only lifecycle inspection

## Why

v2.4 已经形成从 proposal、patch、verification 到 isolated commit 和 source landing 的 session-only 生命周期，但调用方只能依赖最近一次动作的返回值来恢复状态。中断、重试或多步 Harness 调用后，缺少一个明确的只读查询入口，会让已记录的 `blocked`、`interrupted`、`*-creation-unknown` 和 `released` 状态难以继续审阅。

## What changes

- 在 `ChangeProposalManager` 增加按 `proposalId` 查询当前 session registry 快照的只读 API。
- 在 `repo_atlas_change_proposal` 增加 `inspect` action。
- 返回现有 bounded、redacted 的 `ChangeProposalResult` 结构，保留 proposal、patch、verification、commit、landing 和显式非执行状态。
- 为 pending、terminal、uncertain、unknown proposal 增加测试和 Harness schema 覆盖。
- 更新安全边界、Harness 集成说明和 roadmap。

## Scope boundary

- 只查询当前进程内 session memory；不写 workspace、磁盘、数据库或远程服务。
- 不刷新 Git、worktree、source workspace 或 Harness approval/Goal 状态。
- 不重新计算 digest，不改变 proposal、patch、verification、commit、landing 或 release 状态。
- 不返回 canonical patch text；已有 `export-patch` 仍是唯一的显式 patch text 返回路径。
- 不引入跨 session registry、持久化审计日志、网络访问、补丁生成/应用或新的 Git 操作。
