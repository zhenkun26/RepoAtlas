# ast-syntax-confirmation Specification

## Purpose
为 RepoAtlas 提供受 workspace、只读策略和资源预算约束的 TypeScript/JavaScript 语法确认，让 AST 证据与文本推测明确分层，并在解析失败或语言不支持时安全保留部分结果。
## Requirements
### Requirement: The system SHALL parse only confirmed supported source text

AST 分析 MUST 只处理用户已确认 scope 内、通过现有 path policy 和敏感内容策略的 TypeScript/JavaScript 文本快照。解析器 MUST 只建立语法树或语法摘要，不得执行代码、导入 workspace 模块、解析运行时依赖、调用 Shell、访问网络或读取 scope 外文件。

#### Scenario: A supported source file is parsed read-only
- **WHEN** 已确认 scope 内的 `.ts`、`.tsx`、`.js` 或 `.jsx` 文件已通过安全读取并且 AST 预算可用
- **THEN** 系统 SHALL 对该脱敏文本建立有界语法摘要，并 SHALL 不执行其中的代码或导入其依赖

#### Scenario: A sensitive or out-of-scope source file is not parsed
- **WHEN** 源文件被敏感路径策略拒绝、位于确认 scope 外或读取未成功
- **THEN** 系统 SHALL 不建立 AST 结果，并 SHALL 保留现有安全跳过、读取失败或未覆盖状态

### Requirement: The system SHALL expose bounded syntax-confirmed observations

AST 结果 MUST 以有界 evidence 形式输出文件路径、行列位置、语法类别和经过脱敏的最小摘要。v1.3 至少 MUST 支持 import/export、顶层声明以及可识别的函数或类声明；单文件节点、观察文本和关系数量 MUST 受分析预算或专用上限约束。

#### Scenario: Imports and declarations receive source locations
- **WHEN** 解析器在源文件中发现 import/export、函数、类或顶层变量声明
- **THEN** 系统 SHALL 输出可关联到文件路径及行列位置的 syntax-confirmed evidence，并 SHALL 不把完整未脱敏源码复制到 AST 结果

#### Scenario: AST output reaches a configured bound
- **WHEN** 单文件 AST 节点或摘要数量达到上限
- **THEN** 系统 SHALL 停止该文件的新增 AST 观察，保留已生成结果，并 SHALL 标记剩余语法范围为部分未分析

### Requirement: The system SHALL distinguish syntax confirmation from text inference

AST 直接支持的观察和关系 MUST 使用 `syntax-confirmed` 状态或等价结构化标记；仅由文本匹配得到的观察和关系 MUST 继续使用 `inferred`。系统 MUST NOT 因同一路径、命名或缓存命中而把文本推测升级为语法确认。

#### Scenario: A parsed import upgrades only the AST-backed relationship
- **WHEN** AST 确认文件 A 存在指向文件 B 的相对 import，且文本搜索也发现同一关系
- **THEN** atlas SHALL 保留一条去重后的关系，并 SHALL 以 syntax-confirmed 状态和 AST evidence ids 表示该关系

#### Scenario: Text-only evidence remains inferred
- **WHEN** 某个关系只有正则文本匹配证据而没有成功的 AST 观察
- **THEN** 系统 SHALL 将该关系标记为 inferred，并 SHALL 不输出 syntax-confirmed 状态

### Requirement: The system SHALL preserve safe partial-result semantics

不支持的语言、语法错误、解析器异常、AST 预算耗尽、读取预算耗尽或用户中断 MUST 不阻塞其他独立文件的分析。系统 SHALL 在结构化结果和报告中区分 syntax-confirmed、inferred、not-analyzed、read-failed、budget-exhausted 和 interrupted 状态，并 SHALL 记录未覆盖路径或解析失败原因的有界摘要。

#### Scenario: Malformed source does not discard valid AST results
- **WHEN** scope 内同时存在一个可解析文件和一个语法错误文件
- **THEN** 系统 SHALL 保留可解析文件的 syntax-confirmed evidence，并 SHALL 将错误文件标记为 read-failed 或 not-analyzed，而不是用文本猜测填充其 AST 结果

#### Scenario: Unsupported language is explicit
- **WHEN** scope 内文件不是 v1.3 支持的 TypeScript/JavaScript 方言
- **THEN** 系统 SHALL 不伪造 AST 结果，并 SHALL 输出 not-analyzed 及受支持语言范围说明

### Requirement: The system SHALL keep AST data session-local and cache-compatible

AST evidence MAY 复用 v1.2 同一 session 的有效脱敏 evidence，但 MUST 绑定兼容的 workspace root、安全策略、metadata fingerprint、scope 和 cache schema。AST 结果 MUST 不写入 workspace、磁盘、数据库或远程服务，也不得跨 session 复用。

#### Scenario: An unchanged parsed file reuses syntax evidence
- **WHEN** 同一 session 后续分析发现文件 fingerprint 和缓存策略兼容且未被追问 scope 覆盖
- **THEN** 系统 SHALL 复用该文件的 syntax-confirmed evidence ids，并 SHALL 不重复全文读取或重新解析该文件

#### Scenario: A changed file drops stale syntax evidence
- **WHEN** 已缓存文件的 size、mtimeMs、ctimeMs 或安全配置发生不兼容变化
- **THEN** 系统 SHALL 移除或替换旧 syntax evidence，并 SHALL 对该文件重新读取、重新解析或标记为未覆盖
