# v2.7 Read-only live-state inspection

## Why

v2.5/v2.6 能查询 session registry 的 lifecycle 和 summary，但这些结果不会说明 source workspace 或 isolated worktree 当前是否 dirty、是否仍在原 revision、以及一次 uncertain Git 操作之后哪些 postconditions 可以被现场观察到。调用方需要一个明确区分“session snapshot”和“live local observation”的只读入口。

## What changes

- 在 `ChangeProposalManager` 增加 live-state inspection API，复用现有本地 Git adapter inspection。
- 在 `repo_atlas_change_proposal` 增加 `inspect-live` action。
- 返回 source/worktree 的 bounded observation：clean、revision/base match、repository/path identity match 和 changed path count。
- 对 source/worktree inspection failure 返回 partial/unknown observation，但不修改 proposal lifecycle 或 execution status。
- 更新安全边界、Harness 文档、roadmap 和测试。

## Scope boundary

- 只执行固定的本地只读 Git inspection；不执行 merge、commit、apply、reset、revert、remove、push 或任意 shell。
- 不改变 proposal、patch、verification、commit、landing 或 release 状态；live observation 不能升级 `creation-unknown` 为成功。
- 不返回 workspace/worktree paths、changed path names、evidence、digest、patch text 或 commit message。
- 不联网、不持久化、不跨 session，不请求 Harness approval/Goal，不调用 sandbox/subprocess。
