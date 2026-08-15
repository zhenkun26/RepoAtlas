# lifecycle-inspection Specification

## ADDED Requirements

### Requirement: The system SHALL expose a session-only proposal lifecycle snapshot

系统 MUST 提供按已知 `proposalId` 查询当前 session registry 的只读接口，并返回现有 bounded、redacted 的 `ChangeProposalResult` 结构。结果 MUST 包含当前 proposal status、operationStatus、nested patch/verification/commit/landing 状态以及已有的 `patch-not-applied`、`commit-not-created`、`push-not-performed` 等非执行状态；系统 MUST 不创建第二套持久化历史模型。

#### Scenario: Inspect a pending proposal

- **WHEN** 调用方使用当前 session 中仍处于 awaiting-confirmation 的 proposal id 执行 `inspect`
- **THEN** 系统 SHALL 返回该 proposal 的 session-only 快照，状态仍为 awaiting-confirmation/proposal，且 SHALL 不创建 worktree、不改变 digest 或推进 lifecycle

#### Scenario: Inspect a terminal or uncertain proposal

- **WHEN** 调用方 inspect 已 rejected、blocked、interrupted、released 或包含 `*-creation-unknown` 的 proposal
- **THEN** 系统 SHALL 返回 registry 中已记录的原始状态和非执行语义，不得将其升级为成功、未执行或新的 live Git 结论

### Requirement: The system SHALL fail closed for unknown proposal ids

`inspect` MUST 只接受当前 manager/session 可见的 proposal id。缺少、空值、未知或其他 session 的 id MUST 返回 `status=blocked` 与 `operationStatus=blocked`，不得返回 proposal、patch text、worktree inspection、Git 信息或其他 registry 记录。

#### Scenario: Unknown proposal is denied

- **WHEN** 调用方使用未知 proposal id 或省略 proposal id 执行 `inspect`
- **THEN** 系统 SHALL 返回 blocked 结果且不请求 Harness approval、不调用 Git adapter、不执行 subprocess

### Requirement: The system SHALL keep inspection read-only and snapshot-isolated

`inspect` MUST 只读取当前 manager memory，并 MUST NOT 访问 source workspace、isolated worktree、Git、网络、磁盘、Harness Goal、approval、sandbox 或 subprocess。返回对象 MUST 是 detached snapshot；调用方修改返回对象后，后续 inspect MUST 仍返回未被外部修改的 registry 状态。

#### Scenario: Inspection does not refresh live state

- **WHEN** 调用方 inspect proposal，且 source workspace 或 isolated worktree 的真实状态可能已经变化
- **THEN** 系统 SHALL 返回 session registry 快照并明确不进行 live refresh；查询 SHALL 不改变 proposal lifecycle 或产生外部副作用

#### Scenario: Snapshot mutation does not mutate the registry

- **WHEN** 调用方修改 inspect 结果中的 proposal、targets、nested patch summary 或 verification 字段后再次 inspect 同一 proposal
- **THEN** 系统 SHALL 返回原始 registry 值，证明结果与 session registry 相互隔离
