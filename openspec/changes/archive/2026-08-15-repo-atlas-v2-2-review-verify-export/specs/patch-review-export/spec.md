## Purpose

为已确认的隔离补丁提供可审阅、可验证 digest 绑定且仅限当前 session 的交付出口，同时不把补丁写入 workspace 或其他持久化介质。

## ADDED Requirements

### Requirement: The system SHALL provide an explicit bounded patch review

对于当前 session 已登记的 patch draft，review MUST 返回 proposal、patch 状态、canonical summary、targets、limitations、confirmation digest、application status 和 verification status。未知 patch、非当前 session patch、已释放 proposal 或损坏的状态 MUST 返回 bounded blocked result，且不得读取新的仓库内容或写入文件。

#### Scenario: A prepared patch can be reviewed before application
- **WHEN** 当前 session 中存在 status=awaiting-confirmation 的 patch draft，调用方请求 review
- **THEN** 系统 SHALL 返回与 canonical patch digest 绑定的有限摘要，不调用 Git apply、不创建文件、不改变 patch 状态

#### Scenario: An unavailable patch cannot be reviewed as successful
- **WHEN** review 指向未知、过期后被阻断、已拒绝或已释放 proposal 的 patch
- **THEN** 系统 SHALL 返回 blocked 或既有 terminal 状态，不声称 patch 可应用

### Requirement: The system SHALL export only the exact session-local canonical patch

export MUST 要求 patch id 和完全匹配的 confirmation digest。成功 export MUST 返回 canonical patch text、patch digest、proposal id、summary 和 `sessionOnly=true`；系统 MUST 不写入 workspace、临时文件、缓存、数据库或远程服务。超出既有 patch budget 或包含敏感内容的 patch 不得被 export。

#### Scenario: Exact digest exports the reviewed patch bytes
- **WHEN** 调用方为当前 session 的 prepared 或 applied patch 提供完全匹配的 patch confirmation digest
- **THEN** 系统 SHALL 返回与 digest 一致的 canonical patch text 和 bounded metadata，且 SHALL 不执行 Git、Shell、network 或持久化写入

#### Scenario: Digest mismatch does not disclose patch text
- **WHEN** export 使用错误、缺失或格式非法的 digest
- **THEN** 系统 SHALL 返回 bounded non-success result，且返回值 MUST 不包含完整 patch text

### Requirement: The system SHALL keep export separate from patch application

export 成功 MUST NOT 将 patch 状态变为 applied，不得创建 worktree、commit 或 push；review/export result MUST 明确 patch、commit、push 和 verification 的独立状态。

#### Scenario: Export before apply remains non-executed
- **WHEN** 调用方 export 一个 awaiting-confirmation patch
- **THEN** patch state MUST remain awaiting-confirmation，execution status MUST remain patch-not-applied、commit-not-created、push-not-performed
