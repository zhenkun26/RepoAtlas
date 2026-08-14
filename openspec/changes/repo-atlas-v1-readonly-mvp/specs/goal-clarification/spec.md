## Purpose

让 RepoAtlas 在开始扫描代码库前先理解用户真正想解决的问题，并把模糊的自然语言请求收敛为可执行、可确认、可复用的分析目标。

## ADDED Requirements

### Requirement: The system SHALL clarify incomplete analysis goals before exploration

当用户的请求没有明确分析目的、对象、范围或结果形式时，系统 MUST 在开始深度代码探索前进入澄清阶段。

#### Scenario: Incomplete request starts clarification
- **WHEN** 用户只输入“帮我分析这个项目”且未提供分析目的或输出要求
- **THEN** 系统 SHALL 询问一个最能减少分析歧义的问题，且 SHALL NOT 开始深度扫描或生成最终报告

#### Scenario: One question per interaction turn
- **WHEN** 澄清阶段仍存在多个缺失字段
- **THEN** 系统 SHALL 每轮最多提出一个主要问题，并 SHALL 提供可选答案或安全默认值

### Requirement: The system SHALL maintain a structured GoalSpec

系统 MUST 将已收集的目标整理为结构化 GoalSpec，至少包含 `intent`、`audience`、`scope`、`outputs`、`permissions` 和 `success_criteria`。

#### Scenario: GoalSpec is updated after an answer
- **WHEN** 用户回答一个澄清问题
- **THEN** 系统 SHALL 更新对应 GoalSpec 字段，并 SHALL 保留之前已确认的字段

#### Scenario: User narrows the scope
- **WHEN** 用户将分析范围从整个仓库改为某个目录或模块
- **THEN** 系统 SHALL 更新 `scope`，并 SHALL 在后续分析中排除未授权范围

### Requirement: The system SHALL require goal confirmation before analysis

在进入代码探索前，系统 MUST 向用户复述当前 GoalSpec 的关键内容并获得确认；用户明确要求直接开始时，系统可以使用安全默认值代替确认，但 MUST 记录该默认行为。

#### Scenario: User confirms the goal
- **WHEN** 用户确认系统复述的目标、范围和权限
- **THEN** 系统 SHALL 将 GoalSpec 标记为 confirmed，并 SHALL 生成分析计划

#### Scenario: User requests changes during confirmation
- **WHEN** 用户指出复述内容不准确或要求修改
- **THEN** 系统 SHALL 更新 GoalSpec 并 SHALL 在重新确认前不开始分析

### Requirement: The system SHALL support follow-up refinement

分析开始后，用户可以继续追问、缩小范围或修改输出要求；系统 MUST 基于当前 session 复用已确认信息，并在必要时只补充受影响的分析步骤。

#### Scenario: User asks about a discovered module
- **WHEN** 用户要求深入分析报告中已出现的模块
- **THEN** 系统 SHALL 复用当前 GoalSpec 和已有证据，并 SHALL 只扩展该模块相关的分析范围
