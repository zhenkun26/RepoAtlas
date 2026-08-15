# incremental-evidence-cache Specification

## Purpose
让同一 session 的后续分析安全复用未变化文件的有界证据，只重新读取发生变化或被追问覆盖的范围，并让地图与报告明确区分复用、失效和本轮新产生的证据。
## Requirements
### Requirement: The system SHALL scope evidence reuse to a compatible session

增量证据 MUST 只在同一 session、同一 workspace root、同一安全配置和同一缓存版本下复用。缓存条目 MUST 关联相对路径、文件 metadata fingerprint、脱敏后的有界证据和产生该证据时的分析范围；缓存不得作为跨 session 或跨 workspace 的输入。

#### Scenario: A compatible follow-up reuses unchanged evidence
- **WHEN** 同一 session 对同一 workspace 发起追问，且文件 fingerprint、scope 和安全配置均兼容
- **THEN** 系统 SHALL 复用未变化文件的脱敏证据，并 SHALL 保留其原 evidence id 与来源路径

#### Scenario: An incompatible session cannot reuse evidence
- **WHEN** 新 session、不同 workspace root、不同安全配置或缓存版本不兼容的分析请求到达
- **THEN** 系统 SHALL 丢弃或忽略旧缓存并按普通只读分析流程建立新的证据集合

### Requirement: The system SHALL re-read only invalidated analysis coverage

系统 MUST 对当前 workspace 重新获取候选路径及其可用 metadata；fingerprint 未变化的文件 MUST NOT 因追问而重复读取全文。fingerprint 变化、metadata 不可用、新增文件或被追问 scope 覆盖的文件 MUST 重新读取；旧证据不得继续代表已变化文件。

#### Scenario: A changed file replaces stale evidence
- **WHEN** 已缓存文件的 size、修改时间或其他 fingerprint 组成发生变化
- **THEN** 系统 SHALL 重新读取该文件，移除或替换其旧证据，并 SHALL 在增量摘要中标记该路径为 invalidated 或 reread

#### Scenario: A new or removed file updates the map
- **WHEN** 后续分析发现新增文件或确认原缓存路径已不存在
- **THEN** 系统 SHALL 将新增文件纳入当前地图，且 SHALL 从当前有效证据和地图中移除已不存在路径的陈旧贡献

#### Scenario: Metadata cannot establish freshness
- **WHEN** 文件 metadata 无法读取或 fingerprint 无法可靠建立
- **THEN** 系统 SHALL 将该路径视为失效并尝试重新读取，不能静默复用旧证据

### Requirement: The system SHALL constrain incremental coverage to the confirmed follow-up

追问分析 MUST 继承并遵守当前 GoalSpec、scope、路径策略和只读权限；scope 收窄时不得为无关路径启动全文读取，scope 扩大时只补齐新增范围和已失效范围。当前 atlas MUST 基于所有仍有效的证据重建，不能只返回本轮局部结果冒充完整地图。

#### Scenario: A narrowed follow-up avoids unrelated reads
- **WHEN** 用户将追问 scope 限定到 workspace 内的一个模块
- **THEN** 系统 SHALL 复用范围外未变化证据且只读取该模块的新增、变化或直接覆盖路径

#### Scenario: The resulting map remains evidence-backed
- **WHEN** 增量分析完成并生成 atlas
- **THEN** 地图节点、边、结论和 evidence ids SHALL 只引用当前有效证据，并 SHALL 保留部分结果和未覆盖范围状态

### Requirement: The system SHALL preserve budgets and transparent incremental status

缓存复用 MUST NOT 绕过现有候选文件、单文件、总读取量、动作数或脱敏限制。分析结果 SHALL 提供 reused、invalidated、reread、new 和 uncovered 的有界摘要；缓存命中不得被报告为本轮新读取，预算耗尽或读取失败必须继续使用既有部分失败语义。

#### Scenario: Cache reuse does not bypass a read budget
- **WHEN** 新范围的读取会超过现有预算而部分旧证据仍可复用
- **THEN** 系统 SHALL 保留可复用证据，停止或跳过超预算读取，并 SHALL 标记预算耗尽及未覆盖范围

#### Scenario: Incremental status distinguishes reused and fresh evidence
- **WHEN** 一次增量分析同时包含复用、重新读取和未覆盖路径
- **THEN** 报告或结构化分析结果 SHALL 分别列出这些状态，且 SHALL 能通过路径和证据关联进行审计

### Requirement: The cache SHALL remain read-only and redacted

缓存 MUST 只保存已通过现有敏感路径、文本读取和 Secret-like 脱敏策略的有界证据；不得保存敏感原文、未授权环境变量、任意命令输出或远程数据。缓存 MUST 不写入用户 workspace，且 v1.2 不得建立跨 session 或远程持久化。

#### Scenario: Sensitive content is never promoted into the cache
- **WHEN** 文件被敏感路径策略拒绝或读取结果包含被脱敏内容
- **THEN** 缓存 SHALL 只保留现有安全状态和脱敏后的有界结果，不能恢复或暴露敏感原文

#### Scenario: Cache operation has no external side effect
- **WHEN** 分析命中、更新或丢弃 session 证据缓存
- **THEN** 系统 SHALL 不修改 workspace 文件、不执行 Shell、不访问网络，并 SHALL 将缓存生命周期限制在当前 session

