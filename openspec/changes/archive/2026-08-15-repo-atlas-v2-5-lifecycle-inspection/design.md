## Context

RepoAtlas 的 change proposal manager 已在当前 session memory 中维护 proposal、patch、verification、commit 和 landing 的关联状态。每个动作都会返回结构化结果，但 Harness 调用方没有稳定的 proposal-level read-only lookup 来恢复已知状态。新增查询必须复用现有 `ChangeProposalResult` 和 `cloneProposal`，避免第二套快照模型或持久化边界。

## Goals / Non-Goals

**Goals:**

- 通过 proposal id 返回当前 session registry 中的完整生命周期快照。
- 保留现有 bounded、redacted 字段和显式 `patch-not-applied`、`commit-not-created`、`push-not-performed` 等状态。
- 对 unknown proposal fail closed，且不泄露其他 session 或 filesystem 信息。
- 明确查询是 memory snapshot，不对 Git 或 Harness 能力做 live refresh。

**Non-Goals:**

- 不读取 source workspace、isolated worktree 或 Git 状态。
- 不改变任何 proposal lifecycle 状态，不触发审批、命令、Git、网络或 cleanup。
- 不导出 patch text，不新增跨 session history、event log 或数据库。
- 不提供按 session 的列表接口；本版本只接受已知 proposal id。

## Invariants

1. `inspect(proposalId)` 只从当前 manager 的 proposal registry 解析 proposal，并通过既有 clone helper 返回 detached snapshot。
2. 已知 proposal 的返回 status、operationStatus、nested operation status 和非执行状态必须与 registry 当前值一致；查询本身不得推进状态。
3. unknown、空值或跨 manager 不可见的 proposal id 返回 `blocked`，不返回 proposal、patch text、worktree inspection 或其他 registry 信息。
4. `inspect` 不调用 Git adapter、Harness approval、Goal、sandbox、subprocess 或网络能力。
5. 返回快照中的 bounded/redacted 约束与普通 lifecycle result 相同；调用方修改返回对象不得改变 manager 内部状态。

## Failure / Recovery

- proposal id 缺失或不是当前 session 的记录：返回 `status=blocked`、`operationStatus=blocked`，说明 proposal 不可用。
- proposal 已 rejected、blocked、interrupted、released 或包含 creation-unknown 状态：仍返回已记录快照，不把结果升级为成功或未执行。
- 查询不产生副作用，因此没有 worktree、source workspace、Git index 或 remote recovery action。

## Call Chain / Side-Effect Boundary

`repo_atlas_change_proposal(inspect)` → `proposalInput` → `ChangeProposalManager.inspect` → `resultFor` → `cloneProposal`；调用链不进入 Git adapter、Harness approval 或 subprocess。

## Verification Evidence

- manager 测试证明 pending、rejected/terminal 和 unknown proposal 的快照行为、状态保留、无副作用和 clone 隔离。
- tool/plugin 测试证明 `inspect` 已注册且仍要求 proposal id；缺失 id fail closed。
- 手工 L2 对照 action enum、参数、返回结构、错误状态和 side-effect boundary。
- 全量 tests、lint、native typecheck、独立 tsc、OpenSpec strict validation 和 diff checks 通过。
