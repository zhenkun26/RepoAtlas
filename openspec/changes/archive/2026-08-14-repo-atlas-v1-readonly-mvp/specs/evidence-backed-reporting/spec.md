## Purpose

让 RepoAtlas 的代码星图不仅给出概览，还能让用户沿着文件证据验证结论，并清楚区分已确认信息、推测信息、未分析范围和安全策略造成的缺口。

## ADDED Requirements

### Requirement: The system SHALL generate a structured code atlas report

系统 MUST 根据已确认的 GoalSpec 生成结构化报告；项目接手概览至少包含项目摘要、技术栈、目录结构、核心模块、可能入口、运行或测试配置和推荐阅读顺序，架构概览至少包含静态模块关系和主要依赖边界。

#### Scenario: Onboarding report is generated
- **WHEN** 项目接手分析完成且存在足够的有效观察
- **THEN** 报告 SHALL 包含新开发者能够开始阅读项目所需的核心信息

#### Scenario: Architecture report is generated
- **WHEN** 架构概览分析完成
- **THEN** 报告 SHALL 包含模块关系图或 Mermaid 表达，并 SHALL 说明关系来源和未确认部分

### Requirement: The system SHALL attach evidence to material conclusions

每个影响用户判断的主要结论 MUST 关联至少一个证据位置；证据至少包含文件路径和可定位信息，无法建立证据的结论 MUST 标记为未确认或推测。

#### Scenario: Conclusion has file evidence
- **WHEN** 系统确认项目使用某个框架或某个文件是入口
- **THEN** 报告 SHALL 展示支持该结论的文件路径、配置项、符号或行号信息

#### Scenario: Conclusion lacks sufficient evidence
- **WHEN** 系统只能根据命名或不完整内容推断某个模块的作用
- **THEN** 报告 SHALL 明确标记推断状态，并 SHALL NOT 用确定语气呈现

### Requirement: The system SHALL distinguish analysis status and uncertainty

报告 MUST 区分已确认、推测、未分析、读取失败、被安全策略跳过和预算耗尽等状态，并 MUST 说明这些状态对报告结论的影响。

#### Scenario: Sensitive file is skipped
- **WHEN** 关键配置文件因敏感规则未被读取
- **THEN** 报告 SHALL 说明该信息未被分析，并 SHALL 不要求用户通过报告泄露敏感内容

#### Scenario: Analysis is partial
- **WHEN** 探索因预算、解析失败或用户中断提前结束
- **THEN** 报告 SHALL 列出已完成范围和未完成范围，并 SHALL 给出安全的后续分析建议

### Requirement: The system SHALL provide stable report representations

v1 MUST 生成面向用户阅读的 Markdown 报告，并 MUST 提供可用于渲染关系图和后续追问的结构化 atlas 数据；报告默认通过当前 Harness session 返回，不得未经确认写入用户代码库。

#### Scenario: Markdown report is returned
- **WHEN** 分析达到完成条件
- **THEN** 系统 SHALL 在当前 session 返回 Markdown 报告和 Mermaid 关系图文本

#### Scenario: User requests export
- **WHEN** 用户明确要求保存报告
- **THEN** 系统 SHALL 先确认目标路径和写入权限，再只写入用户确认的输出位置

### Requirement: The system SHALL support evidence-aware follow-up questions

用户追问某个模块、结论或证据时，系统 MUST 复用当前 session 中的 GoalSpec 和已保存证据，并 SHALL 将新增分析限制在追问相关范围内。

#### Scenario: User asks to explain a module
- **WHEN** 用户要求深入解释报告中的一个模块
- **THEN** 系统 SHALL 使用该模块已有证据回答，并 SHALL 仅在缺少证据时追加只读探索
