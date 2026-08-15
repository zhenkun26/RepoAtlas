# controlled-actions Specification

## Purpose
让用户能够在明确授权后运行少量可信、可复现且受沙箱和预算约束的项目检查动作，同时让每次执行都能被审计、复核和安全地归因。
## Requirements
### Requirement: The system SHALL execute only trusted configured recipes

系统 MUST 只执行可信配置中预先声明的 recipe；每个 recipe MUST 提供固定的可执行文件与 argv 模板、允许的沙箱模式、工作目录规则、超时上限和 stdout/stderr 输出上限。模型输入 MUST 只能选择 recipe 标识和受范围约束的参数，不能提交任意 Shell 字符串或新的可执行文件。

#### Scenario: An unconfigured recipe is requested
- **WHEN** Agent 请求一个不存在或未启用的 recipe
- **THEN** 系统 SHALL 拒绝动作，且 SHALL 不创建子进程

#### Scenario: A shell-shaped command is requested
- **WHEN** Agent 在动作输入中提交 `sh -c`、`bash -c` 或自由命令字符串
- **THEN** 系统 SHALL 拒绝该输入，并 SHALL 保留配置 recipe 不变

### Requirement: The system SHALL require layered confirmation before execution

系统 MUST 同时要求已确认的 GoalSpec、已确认本次动作和启用的动作权限；任何一层缺失都 MUST 在执行前返回澄清或拒绝结果。直接开始分析的安全默认 MUST NOT 隐式批准受控动作。

#### Scenario: Goal is not confirmed
- **WHEN** 用户尚未确认分析目标但 Agent 请求运行 recipe
- **THEN** 系统 SHALL 返回需要确认的状态，且 SHALL 不启动动作

#### Scenario: User confirms a bounded action
- **WHEN** GoalSpec 已确认、用户明确确认指定 recipe、工作目录和沙箱模式，且 recipe 已启用
- **THEN** 系统 SHALL 进入一次性执行流程，并 SHALL 将批准事实绑定到该动作而非后续所有动作

### Requirement: The system SHALL fail closed at the sandbox boundary

受控动作 MUST 通过 Harness 的 sandbox 能力包装精确 argv，并 MUST 通过 Harness 的 subprocess 能力管理进程树、超时和终止。沙箱服务不可用、只提供部分但 recipe 要求完整约束、或包装失败时，系统 MUST 拒绝执行，绝不降级为未隔离运行。

#### Scenario: Sandbox is unavailable
- **WHEN** 当前 Harness session 没有可用的 sandbox provider
- **THEN** 系统 SHALL 返回可区分的沙箱不可用结果，且 SHALL 不启动原始 argv

#### Scenario: Process exceeds the deadline
- **WHEN** 动作超过 recipe 的最大时长
- **THEN** 系统 SHALL 终止整个受管进程树，记录超时状态，并 SHALL 返回已截断且已脱敏的输出

### Requirement: The system SHALL enforce workspace and output budgets

系统 MUST 将动作 cwd 规范化到已确认 workspace 内，并 MUST 对单次 stdout、stderr、总动作时长和 session 动作数设置上限。超出任一限制时 MUST 停止或拒绝动作，并 SHALL 标记未完整收集的结果。

#### Scenario: Action cwd escapes the workspace
- **WHEN** recipe 请求的 cwd 解析到 workspace 外部或通过符号链接逃逸
- **THEN** 系统 SHALL 拒绝动作，且 SHALL 不调用 sandbox 或 subprocess

#### Scenario: Output exceeds the capture budget
- **WHEN** stdout 或 stderr 超过 recipe 的捕获上限
- **THEN** 系统 SHALL 保留有界输出，标记截断，并 SHALL 不把完整未脱敏输出发送给模型

### Requirement: The system SHALL record auditable and redacted outcomes

系统 MUST 为每次动作记录 recipe、规范化 cwd、批准/拒绝原因、沙箱模式与 enforcement、退出码或终止原因、预算状态和脱敏后的输出摘要。日志、证据和报告 MUST NOT 保存敏感原文或未授权环境变量。

#### Scenario: Action completes successfully
- **WHEN** 受控动作在预算内退出且退出码为零
- **THEN** 系统 SHALL 返回成功结果，并 SHALL 关联动作证据与输出摘要

#### Scenario: Action is denied or fails
- **WHEN** Policy Gate 拒绝动作、沙箱拒绝动作或进程以非零状态退出
- **THEN** 系统 SHALL 返回明确失败状态，保留拒绝/失败原因，并 SHALL 不伪装成分析成功
