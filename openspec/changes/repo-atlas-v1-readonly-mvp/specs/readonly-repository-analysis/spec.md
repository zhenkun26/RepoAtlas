## Purpose

让 RepoAtlas 在已确认目标和安全策略的约束下，以可控的只读方式理解本地代码库，输出项目结构、技术栈、入口和静态关系等基础代码星图信息。

## ADDED Requirements

### Requirement: The system SHALL analyze only the confirmed workspace scope

系统 MUST 仅分析用户确认的 workspace 和范围，并 MUST 默认排除版本控制目录、依赖目录、构建产物、缓存和其他配置的排除路径。

#### Scenario: Whole repository analysis
- **WHEN** GoalSpec 确认分析整个 workspace
- **THEN** 系统 SHALL 扫描 workspace 内符合规则的文件，并 SHALL 跳过默认排除目录

#### Scenario: Directory-scoped analysis
- **WHEN** GoalSpec 只允许分析 `src/` 目录
- **THEN** 系统 SHALL 不读取 `src/` 之外的普通项目文件，除非用户重新确认扩大范围

### Requirement: The system SHALL produce a bounded analysis plan

系统 MUST 根据已确认的 `intent` 选择有限的分析路径；v1 至少支持项目接手概览和架构概览两类路径，并 MUST 为每条路径定义分析目标和完成条件。

#### Scenario: Onboarding plan
- **WHEN** `intent` 为项目接手概览
- **THEN** 分析计划 SHALL 包含技术栈、启动入口、核心目录、运行方式和推荐阅读顺序

#### Scenario: Architecture plan
- **WHEN** `intent` 为架构概览
- **THEN** 分析计划 SHALL 包含模块关系、依赖方向、主要配置和可识别的数据或调用边界

### Requirement: The system SHALL use only read-only exploration actions in v1

v1 的探索动作 MUST 限制为列举路径、读取允许的文本文件、搜索文本或符号、解析常见配置和生成静态关系；系统 MUST NOT 写入文件、执行任意 Shell、安装依赖或访问网络。

#### Scenario: Read-only exploration succeeds
- **WHEN** Agent 需要确认项目技术栈
- **THEN** 系统 SHALL 读取允许的清单或配置文件，并 SHALL 将观察结果关联到来源文件

#### Scenario: Side-effectful action is requested
- **WHEN** Agent 请求运行测试、构建、安装依赖、写文件或网络请求
- **THEN** 系统 SHALL 拒绝该动作，并 SHALL 向用户说明 v1 的只读边界

### Requirement: The system SHALL bound the ReAct exploration loop

系统 MUST 限制单次分析的文件数量、单文件大小、总读取量和探索动作数；达到预算时 MUST 停止继续扫描并在报告中说明未完成的范围。

#### Scenario: Exploration budget is exhausted
- **WHEN** 扫描达到任一资源预算上限
- **THEN** 系统 SHALL 停止新增探索动作，并 SHALL 输出已完成范围、未完成范围和继续分析建议

#### Scenario: Unsupported or binary file is encountered
- **WHEN** 系统遇到二进制文件、无法解码文件或超出单文件大小上限的文件
- **THEN** 系统 SHALL 跳过该文件，并 SHALL 将跳过原因记录为分析状态而不是读取其内容

### Requirement: The system SHALL return partial results safely

当文件不可读、路径消失、解析失败或单个分析器失败时，系统 MUST 保留已经验证的结果，标记受影响的结论，并 SHALL NOT 用猜测填充缺失信息。

#### Scenario: One file cannot be parsed
- **WHEN** 某个配置文件格式无效或解析器失败
- **THEN** 系统 SHALL 继续其他独立分析，并 SHALL 将该文件标记为未确认或解析失败
