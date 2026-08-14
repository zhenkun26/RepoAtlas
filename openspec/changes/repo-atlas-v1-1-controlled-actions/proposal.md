## Why

RepoAtlas v1 能安全地阅读和解释代码库，但遇到“验证修复是否有效”时只能停在静态判断，无法在用户明确授权后运行受控的测试、构建或检查。v1.1 需要增加一条可审计的窄能力通道，同时保持默认拒绝，避免把框架约束调节成任意 Shell 执行。

## What Changes

- 增加配置化的受控动作 recipe：命令 argv、允许的沙箱模式、超时和输出预算由可信配置定义，模型不能自由拼接可执行文件或 Shell 字符串。
- 增加动作确认与 Policy Gate：未确认 GoalSpec、未确认本次动作、未启用 recipe、路径越界、沙箱不可用或超出预算时均拒绝执行。
- 通过 Harness 的 `subprocess` 与 `sandbox` 公开能力执行精确 argv；不在 RepoAtlas 内直接调用 Node 子进程 API。
- 将动作提案、批准、拒绝、退出状态、超时、截断和脱敏后的输出写入当前 session 的证据链。
- 保持网络访问、依赖安装、Git 推送、任意 Shell 和未配置命令默认拒绝。

## Capabilities

### New Capabilities

- `controlled-actions`: 在用户确认和可信 recipe 配置下执行有界、可审计、经 Harness 沙箱约束的本地动作。

### Modified Capabilities

- None. v1 的只读能力和默认拒绝边界保持不变；v1.1 的动作是独立新增能力。

## Impact

- 影响 RepoAtlas 配置模型、Harness 插件工具注册、Policy Gate、审计/证据报告和测试 fixture。
- 依赖已安装 Harness 提供的公开 `subprocess`、`sandbox` 能力；没有这些能力时动作必须故障关闭。
- 不新增运行时依赖，不修改用户 workspace 的默认行为，不自动提交或推送 Git。
