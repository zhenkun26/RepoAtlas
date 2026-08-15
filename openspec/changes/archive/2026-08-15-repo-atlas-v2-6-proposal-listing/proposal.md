# v2.6 Bounded session-only proposal listing

## Why

v2.5 提供了按 proposal id 的 lifecycle inspection，但调用方必须先持有 id 才能恢复当前 session 的 proposal 状态。多 proposal、多轮 Harness 调用或异常中断后，缺少一个 bounded index 会让可用的 session-only 状态难以发现。

## What changes

- 在 `ChangeProposalManager` 增加 bounded proposal listing API。
- 在 `repo_atlas_change_proposal` 增加 `list` action，支持受限 `limit`。
- 返回不含路径、evidence、digest、patch text、commit message 或 worktree 的 session-only summary。
- 以 deterministic newest-first 顺序返回 proposal 状态，并显式报告 total、returned 和 truncated。
- 更新 lifecycle 相关安全边界、Harness 文档、roadmap 和测试。

## Scope boundary

- 只读取当前 manager 的 session memory；不跨 session、不持久化、不联网。
- 不读取 source workspace、isolated worktree 或 Git，不刷新 live 状态。
- 不触发 approval、Goal、sandbox、subprocess、patch、commit、landing 或 release。
- `limit` 只能是正整数且受固定上限约束；不接受排序、过滤、路径或任意查询表达式。
- 不改变 v2.5 的 `inspect` 语义，也不实现 event history、rollback、merge 或团队协作索引。
