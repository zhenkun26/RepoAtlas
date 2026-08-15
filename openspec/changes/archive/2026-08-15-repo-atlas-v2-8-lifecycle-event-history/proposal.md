# v2.8 Session-only lifecycle event history

## Why

v2.5-v2.7 能分别查看当前 proposal 的 lifecycle snapshot、bounded summary 和实时本地观察，但无法回答“当前 session 中这个 proposal 经过了哪些已记录的 lifecycle 转移”。调用方需要一个有限、脱敏、只读的时间线，同时不能把它误解为持久化审计日志，也不能把 live observation 或 proposal 查询变成状态变更。

## What changes

- 在 `ChangeProposalManager` 中为每个 proposal 维护 session-only、bounded 的 lifecycle event history。
- 增加只读 `history` action，支持有限条数、确定性顺序和截断标记。
- 在 proposal/worktree、patch、verification、commit、landing、release 的实际状态变更处记录事件；失败、中止和 uncertain 结果保留原有状态与非执行语义。
- 更新类型、Harness schema、OpenSpec 主 spec、安全边界、roadmap 和测试。

## Scope boundary

- 事件只存在当前 `ChangeProposalManager` 内存中，不写 workspace、磁盘、数据库，不跨 session，不联网，不上传代码。
- `inspect`、`list`、`inspect-live`、`review-patch`、`export-patch` 以及 digest 不匹配/审批未通过等未发生状态变更的调用不新增事件。
- 事件不包含 workspace/repository/worktree path、changed path names、evidence ids、confirmation digest、patch text、commit message 或 approval secret。
- v2.8 不新增 patch 生成/应用、回滚、merge、commit、push、部署、依赖安装或任意 shell 权限。
