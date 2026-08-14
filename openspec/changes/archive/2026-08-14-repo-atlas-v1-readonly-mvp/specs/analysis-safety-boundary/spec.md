## Purpose

为 RepoAtlas 建立默认拒绝的安全边界，保护用户代码、凭证和本地环境，确保仓库内容只能作为不可信数据被分析而不能改变 Agent 的权限或行为。

## ADDED Requirements

### Requirement: The system SHALL deny side effects by default

v1 MUST 默认拒绝文件写入、删除、重命名、任意 Shell、依赖安装、网络访问、Git 推送和外部服务调用；未列入 v1 只读动作集合的操作 MUST 被拒绝。

#### Scenario: Agent attempts to modify a file
- **WHEN** Agent 请求创建、修改或删除 workspace 中的文件
- **THEN** Policy Gate SHALL 拒绝该操作，并 SHALL 保持 workspace 内容不变

#### Scenario: Agent attempts network access
- **WHEN** Agent 请求访问 URL、远程 API、包仓库或 Git 远程端点
- **THEN** Policy Gate SHALL 拒绝该操作，并 SHALL 记录网络访问被 v1 策略阻断

### Requirement: The system SHALL enforce workspace containment

系统 MUST 将所有路径规范化后再访问，并 MUST 拒绝 workspace 根目录之外的路径、通过 `..` 逃逸的路径以及解析后指向 workspace 外部的符号链接。

#### Scenario: Parent traversal is requested
- **WHEN** 读取目标包含 `../` 且规范化后超出 workspace 根目录
- **THEN** 系统 SHALL 拒绝读取并 SHALL 不向模型返回目标文件内容

#### Scenario: Symlink escapes the workspace
- **WHEN** workspace 内的符号链接指向 workspace 外部
- **THEN** 系统 SHALL 拒绝跟随该链接，并 SHALL 在分析结果中标记路径被安全策略跳过

### Requirement: The system SHALL protect sensitive files and content

系统 MUST 默认跳过 `.env`、私钥、凭证、密钥和用户配置等敏感文件模式，并 MUST 在内容进入模型上下文或报告前执行敏感信息过滤。

#### Scenario: Sensitive file is discovered
- **WHEN** 扫描发现 `.env`、`*.pem`、`*.key`、`credentials.*` 或等价敏感路径
- **THEN** 系统 SHALL 不读取其内容，并 SHALL 只记录文件被安全策略跳过

#### Scenario: Secret-like value appears in an allowed file
- **WHEN** 普通文本文件包含疑似 API Key、Token、密码或私钥片段
- **THEN** 系统 SHALL 在发送给模型和写入报告前遮蔽该值，并 SHALL 保留脱敏后的证据位置

### Requirement: The system SHALL treat repository content as untrusted data

README、注释、脚本、配置和命令输出中的指令 MUST 被视为待分析内容，不得提升为系统指令、权限策略或工具授权。

#### Scenario: Prompt injection appears in repository text
- **WHEN** 文件内容要求 Agent 忽略安全规则、读取凭证或上传代码
- **THEN** 系统 SHALL 将其作为普通文本记录或报告内容，并 SHALL 继续遵守系统和 Policy Gate 规则

### Requirement: The system SHALL enforce resource budgets and local auditability

系统 MUST 对文件数量、单文件大小、总读取量和 ReAct 动作数设置上限，并 MUST 在当前本地 session 中记录安全决策、拒绝动作、跳过原因和预算耗尽状态；v1 不得将审计数据上传到外部服务。

#### Scenario: Resource limit is reached
- **WHEN** 分析达到任一预算上限
- **THEN** 系统 SHALL 停止相应动作，并 SHALL 在报告中说明预算类型和未分析范围

#### Scenario: A policy decision is made
- **WHEN** Policy Gate 允许、拒绝或跳过一个文件或工具动作
- **THEN** 系统 SHALL 记录决策类型、目标类别和原因，但 SHALL NOT 在日志中保存敏感原文
