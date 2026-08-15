## Context

v2.4 已提供 `GitWorktreeAdapter.inspectSource` 与 `inspect`，但这些能力目前只在会改变或验证 lifecycle 的 manager 操作内部使用。v2.7 将它们暴露为独立、只读的 live observation，并与现有 `ChangeProposalResult` 分离，避免把现场观察混入 session registry 或错误地修复 uncertain 状态。

## Goals / Non-Goals

**Goals:**

- 对当前 session 的已知 proposal 查询 source workspace 和（若存在）isolated worktree 的 live 状态。
- 明确返回 available、partial、unknown、not-applicable 观察状态和 checkedAt。
- 返回有限布尔/计数/Revision 字段，帮助判断 clean、base/identity/repository match，而不泄露路径或 changed path names。
- 复用已有固定 Git adapter，保持 no-network、shell:false 和现有错误脱敏。

**Non-Goals:**

- 不同步 registry，不改变 `commitCreated`、`sourceLanded`、execution status 或任何 lifecycle transition。
- 不执行修复、回滚、cleanup、merge、commit、patch、push 或远程操作。
- 不提供跨 session、持久化、事件历史、冲突解析或团队协作状态。

## Invariants

1. `inspect-live(proposalId)` 只接受当前 session registry 中已知 proposal，并从记录的 source/worktree 派生所有 adapter 参数；工具输入不能提供 path、revision、command 或 Git options。
2. source inspection 总是尝试；没有 managed worktree 时 worktree observation 为 `not-applicable`，不会伪造 worktree 成功。
3. source 与 worktree inspection 均成功时 overall status 为 `available`；仅一侧成功时为 `partial`；所有已尝试检查失败时为 `unknown`。
4. observation 只返回 clean/dirty、revision、base match、identity/repository/path match 和 changed path count；不返回绝对路径或 path names。
5. inspection failure、AbortSignal 和 postcondition unknown 只影响 live observation，不改变 session registry，不将 uncertain 状态升级为成功或未执行。
6. adapter 只能使用既有固定本地 Git read-only inspection；不触发 Harness approval、Goal、sandbox、subprocess 或网络。

## Failure / Recovery

- unknown proposal 返回 blocked，且不调用 adapter。
- source/worktree inspection error 被 bounded/redacted 后写入 observation reason；manager 保留原 proposal snapshot。
- source 成功、worktree 失败或反之返回 partial；两侧都失败返回 unknown；不会执行自动恢复。
- abort 在检查前或检查中返回 interrupted/unknown observation，不声明 live state 已确认。

## Call Chain / Side-Effect Boundary

`repo_atlas_change_proposal(inspect-live)` → `proposalInput` → `ChangeProposalManager.inspectLive` → `GitWorktreeAdapter.inspectSource/inspect` → bounded live observation；调用链不进入 mutation adapter methods、approval、sandbox、subprocess 或 network。

## Verification Evidence

- manager tests 覆盖 source-only、source+worktree、dirty/revision/identity mismatch、partial、unknown、abort、unknown proposal 和 no-lifecycle-mutation。
- Harness tests 覆盖 action schema、缺少/unknown proposal fail closed 和 live result rendering。
- 临时 Git adapter/read-only call assertions证明没有 mutation method、remote 或 path names 暴露。
- 全量 tests、lint、native typecheck、独立 tsc、OpenSpec strict validation 和 diff checks 通过。
