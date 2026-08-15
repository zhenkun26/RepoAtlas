## Context

v2.5 的 manager registry 已按 proposal id 保存当前 session 的完整生命周期状态。listing 应复用该 registry，不引入第二个索引或持久化存储；输出必须是比 `ChangeProposal` 更窄的 summary，避免批量暴露 workspace 路径、evidence ids、digest、patch text、commit message 或 worktree identity。

## Goals / Non-Goals

**Goals:**

- 提供 bounded、deterministic、newest-first 的 proposal summary 列表。
- 让调用方发现 proposal id 后，可以继续使用 v2.5 `inspect` 获取当前 session 快照。
- 让空 registry、limit 截断和 invalid limit 都有明确结构化结果。
- 保留 proposal、patch、verification、commit、landing 的状态和非执行语义。

**Non-Goals:**

- 不提供跨 session、磁盘、数据库或远程索引。
- 不执行 live Git/worktree inspection，不把 session 状态升级为 filesystem 事实。
- 不支持过滤、搜索、排序字段、分页 cursor、路径查询或全文 patch export。
- 不改变任何 lifecycle 状态，不引入 event history、rollback、merge 或 cleanup。

## Invariants

1. `list(limit)` 只读取当前 manager 的 proposal registry，并最多返回固定上限内的 summary。
2. 默认 limit 为 50，调用方 limit 必须是正的 safe integer且不超过 100；无效值 fail closed。
3. 返回顺序按 `createdAt` 降序，时间相同时按 proposal id 降序，保证同一 registry 的结果 deterministic。
4. 每个 summary 只包含 bounded intent、id、时间、target count、lifecycle/execution/nested operation status 和 boolean outcome flags；不包含路径、evidence、digest、patch text、commit message 或 worktree identity。
5. list 不调用 Git adapter、Harness approval、Goal、sandbox、subprocess、network 或 filesystem，并且不改变 registry。

## Failure / Recovery

- 空 registry 返回 `status=available`、空 proposals、`total=0`、`returned=0`、`truncated=false`。
- limit 缺失使用默认值；limit 为 0、负数、小数、非 safe integer 或超过上限时返回 `status=blocked` 与空 proposals，不列举 registry 内容。
- proposal 中已记录的 rejected、blocked、interrupted、released 或 creation-unknown 状态原样出现在 summary 中，不升级为成功或未执行。
- listing 没有外部副作用，因此不执行 worktree、source workspace 或 Git recovery。

## Call Chain / Side-Effect Boundary

`repo_atlas_change_proposal(list)` → `proposalInput` → `ChangeProposalManager.list` → bounded summary clone；调用链不进入 Git adapter、Harness approval 或 subprocess。

## Verification Evidence

- manager 测试覆盖空 registry、默认/显式 limit、invalid limit、截断、deterministic order、状态保留和 summary redaction。
- tool/plugin 测试覆盖 `list` schema、正常执行和 invalid limit fail closed，且不请求 approval。
- 手工 L2 对照 action enum、参数、返回结构、limit/error 语义和 side-effect boundary。
- 全量 tests、lint、native typecheck、独立 tsc、OpenSpec strict validation 和 diff checks 通过。
