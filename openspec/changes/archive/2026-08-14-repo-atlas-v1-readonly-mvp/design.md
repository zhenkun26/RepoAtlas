## Context

RepoAtlas 是一个从零开始的 DeepSeek Harness 项目，当前没有既有业务代码或数据迁移约束。本变更的行为契约见同一变更目录下的四份 capability spec；本设计只说明如何在 Harness 的插件模型中实现这些契约。

v1 的主入口是本地 Harness Web UI 中的 RepoAtlas 插件和 session。RepoAtlas 处理一个用户明确选择的本地 workspace，默认只读、无网络、无任意命令执行，并在当前 session 内保存 GoalSpec、分析观察、证据和安全决策。报告默认返回对话，不未经确认写入目标代码库。

## Goals / Non-Goals

**Goals:**

- 建立 `Clarify → Policy Gate → Plan → Read-only ReAct → Verify → Report` 的固定执行边界。
- 将用户目标、分析范围、权限和成功标准结构化为 GoalSpec。
- 通过受限的读取、列举、搜索和配置解析动作生成项目接手概览或架构概览。
- 让主要结论具备可定位的文件证据，并显式标记推测、未分析和安全跳过状态。
- 在 workspace 边界、敏感文件、Prompt Injection、资源预算和副作用方面默认安全。
- 保持实现为可替换的 Harness 插件，避免 fork 或修改 Harness 核心。

**Non-Goals:**

- 不实现代码编辑、自动修复、Git 提交或 Pull Request。
- 不执行测试、构建、安装依赖或任意 Shell 命令。
- 不访问网络、远程仓库、外部知识库或外部模型服务。
- 不建立 SaaS、多用户权限、团队共享数据库或远程报告存储。
- 不实现完整的语言服务器、编译器级别的语义分析或全量调用图。
- 不在 v1 引入 Tree-of-Thought、多 Agent 辩论或自动插件发现。

## Decisions

### 1. 使用独立插件而不是修改 Harness 核心

RepoAtlas 作为 out-of-tree 插件注册自己的状态、只读工具、策略和报告能力，通过 Harness 的公开插件接口组合运行。

选择原因：

- 适配“一切皆插件”的 Harness 架构。
- 可以独立替换分析器和报告器。
- 降低 Harness Developer Preview API 变化带来的维护范围。
- 便于后续发布为独立 Profile 或 Bundle。

替代方案是 fork Harness 核心或直接修改默认 Agent Loop；这会扩大升级冲突和安全审查范围，v1 不采用。

### 2. 以 Web UI session 作为 v1 入口

v1 不开发独立前端，使用 Harness Web UI 承载多轮问询、用户确认和报告展示。结构化 atlas 数据以当前 session 可消费的形式返回，Mermaid 文本作为第一版图谱表示。

替代方案是先开发独立 Web 应用或只做 CLI。独立前端会把产品问题扩大为账号、通信和部署问题；CLI 不利于表达多轮澄清和确认，因此延后。

### 3. 将 ReAct 限定为只读观察循环

ReAct 只允许在受策略控制的观察工具之间循环：列举路径、读取普通文本、搜索文本或符号、解析常见配置、生成静态关系。每个动作先经过 Policy Gate，再执行并记录观察和证据。

不采用任意 Shell 加白名单的方式作为 v1 默认方案，因为项目脚本、构建工具和解释器仍可能产生不可见副作用。受控命令执行留给后续隔离沙箱版本。

### 4. GoalSpec 是澄清和追问的唯一状态来源

GoalSpec 至少包含：

```text
intent
audience
scope
outputs
permissions
success_criteria
confirmed
```

它与当前 Harness session 绑定，不在 v1 引入独立数据库。用户修改目标时先更新 GoalSpec，再决定是否重算受影响的分析步骤。

替代方案是把目标保留在自然语言 Prompt 中；这种方式无法可靠判断范围、权限和完成条件，不采用。

### 5. Policy Gate 采用默认拒绝和确定性规则

Policy Gate 位于所有模型可调用的 RepoAtlas 工具之前，负责：

- 规范化路径并校验 workspace containment。
- 拒绝 workspace 外路径和逃逸符号链接。
- 匹配敏感文件和凭证规则。
- 拒绝写入、Shell、网络、依赖安装和外部服务。
- 检查文件大小、扫描数量、总读取量和动作预算。

安全边界不能只依赖模型判断。模型可以提出动作，但不能改变 Policy Gate 的规则。

### 6. 以证据记录驱动报告生成

分析过程中产生的每条重要观察都转换为证据记录，至少包含：

```text
evidence_id
source_path
locator
observation
status
redaction_state
```

报告生成器只能引用已记录的观察和证据；没有证据的内容必须以推测或未确认状态呈现。证据记录只保留脱敏后的必要内容，避免把完整源码复制进审计日志。

### 7. 使用有限分析模板控制 v1 复杂度

v1 只提供两个分析模板：

- `onboarding`：技术栈、入口、核心目录、运行配置、阅读顺序。
- `architecture`：模块关系、依赖方向、主要配置和静态边界。

风险审计、变更规划、动态测试和代码修复不是 v1 分析模板，避免目标澄清阶段承诺超出实现边界。

### 8. 资源预算可配置但有安全默认值

初始默认值建议为：

- 最多扫描 5,000 个候选文件。
- 单个文本文件最多读取 1 MiB。
- 单次分析最多读取 20 MiB 文本内容。
- 单次 ReAct 最多执行 60 个观察动作。
- 默认排除 `.git/`、`node_modules/`、`dist/`、`build/`、`coverage/`、缓存和虚拟环境目录。

这些值通过项目配置暴露，但不能被仓库内的文本内容或模型自行修改。达到预算时保留已验证结果，并明确报告未完成范围。

## Risks / Trade-offs

- [仓库 Prompt Injection] → 将所有仓库文本视为不可信数据；系统指令和 Policy Gate 优先级高于文件内容，并加入包含恶意 README 的安全测试夹具。
- [路径遍历和符号链接逃逸] → 所有路径先规范化、解析真实路径并检查 workspace 根目录；拒绝外部目标。
- [敏感信息进入模型或日志] → 敏感路径拒读；普通文件执行 Secret-like 值检测；模型上下文、报告和审计记录只使用脱敏内容。
- [项目脚本产生副作用] → v1 完全不调用 Shell、测试、构建、解释器和包管理器；动态执行单独规划为隔离沙箱变更。
- [大仓库导致成本或拒绝服务] → 文件、大小、总读取量和动作数设置上限；二进制、依赖和构建目录默认跳过。
- [报告幻觉] → 以证据记录作为报告唯一事实来源；无证据结论必须标记状态，不得使用确定语气。
- [Harness Developer Preview 破坏性变更] → 只依赖公开插件和工具接口，避免修改内部 Agent Loop；通过 Profile/Bundle 隔离版本适配。
- [分析结果不完整导致用户误判] → 报告展示跳过、失败、未分析和预算耗尽状态，并提供后续只读追问入口。
- [用户误以为“只读”代表“无风险”] → 在每次分析摘要中展示 workspace、排除规则、权限模式和未读取的敏感范围。

## Migration Plan

这是 greenfield 项目，不需要迁移既有用户数据或数据库。实现阶段先在 RepoAtlas 自己的测试 fixture 和若干本地示例仓库中运行；启用方式采用独立 Harness Profile 或显式 patch。

回滚方式：停止使用 RepoAtlas Profile 或卸载插件即可。v1 不写入目标代码库、不创建远程资源，因此不需要数据回滚。若后续增加报告导出，导出文件必须由用户显式指定位置并单独确认。

## Open Questions

无会改变 v1 规格、架构或任务分解的开放问题。具体语言启发式、报告视觉样式和插件包目录可以在实现阶段通过测试结果优化，但不能突破本变更的只读安全边界。
