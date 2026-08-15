# proposal-listing Specification

## Purpose
TBD - created by archiving change repo-atlas-v2-6-proposal-listing. Update Purpose after archive.
## Requirements
### Requirement: The system SHALL list bounded session-only proposal summaries

系统 MUST 提供 `list` action，读取当前 session registry 中的 proposal，并返回 bounded、deterministic、newest-first 的 summary 列表。每个 summary MUST 包含 proposal id、bounded intent、created/expiry time、target counts、proposal/operation/execution/nested operation statuses 和既有 boolean outcome flags；MUST 不包含 workspace/repository/worktree path、evidence ids、digest、canonical patch text 或 commit message。

#### Scenario: List current proposals with the default limit

- **WHEN** 调用方在当前 session 执行 `list` 且不提供 limit
- **THEN** 系统 SHALL 使用默认 limit 50，按 createdAt 降序返回当前 proposal summaries，并返回 total、returned 和 truncated

#### Scenario: List proposals with an explicit bounded limit

- **WHEN** 调用方提供正的 safe-integer limit 且 limit 不超过 100
- **THEN** 系统 SHALL 最多返回该数量的 summary，保持 deterministic newest-first 顺序，并正确报告是否截断

#### Scenario: Empty registry returns an available empty result

- **WHEN** 当前 session registry 没有 proposal
- **THEN** 系统 SHALL 返回 `status=available`、空 proposals、total=0、returned=0、truncated=false，且不访问 workspace 或 Git

### Requirement: The system SHALL fail closed for invalid listing limits

list 的 limit 缺失时 MUST 使用默认值；limit 为 0、负数、小数、非 safe integer 或超过 100 时 MUST 返回 `status=blocked` 与空 proposals，不得部分执行、静默放宽或暴露 registry 内容。

#### Scenario: Invalid limit is rejected before listing

- **WHEN** 调用方提供 0、负数、小数、非数值或大于 100 的 limit
- **THEN** 系统 SHALL 返回 blocked 结果，且 returned=0、proposals 为空，不触发 approval、Git adapter、subprocess 或 filesystem access

### Requirement: The system SHALL preserve session-only and non-execution boundaries

list MUST 只读取当前 manager memory，不得刷新 live Git/worktree/source workspace 状态，不得改变 proposal lifecycle，不得跨 session 或持久化。rejected、blocked、interrupted、released 与 `*-creation-unknown` 等已记录状态 MUST 原样出现在 summary 中。

#### Scenario: Listing preserves uncertain and non-executed states

- **WHEN** registry 中存在包含 `commit-creation-unknown`、`landing-creation-unknown`、`patch-not-applied` 或 `push-not-performed` 的 proposal
- **THEN** 系统 SHALL 在 summary 中保留这些状态，不得将其升级为 created、landed、applied 或 pushed

#### Scenario: Listing is read-only and deterministic

- **WHEN** 调用方重复执行相同 limit 的 list，且 registry 未发生变化
- **THEN** 系统 SHALL 返回相同顺序和状态，且 SHALL 不调用 Git、Harness approval、Goal、sandbox、subprocess 或网络能力

### Requirement: The system SHALL list only the calling Harness session's proposals

The `list` action MUST select the registry owned by the current Harness session before applying limits or building summaries. It MUST NOT aggregate managers by process, workspace path, repository identity, or plugin instance.

#### Scenario: Another live session has proposals
- **WHEN** the calling Harness session has no proposals but a sibling session in the same plugin process does
- **THEN** `list` SHALL return an available empty result with total zero and SHALL not reveal sibling proposal ids or counts
