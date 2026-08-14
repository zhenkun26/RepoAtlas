## 1. 配置与动作契约

- [x] 1.1 增加受控动作 recipe、沙箱模式、超时、输出预算和启用状态的类型与配置校验，默认关闭。 <!-- PASS: `createConfig` 校验 kebab-case recipe、裸 executable、非 shell argv、超时和输出预算。 -->
- [x] 1.2 实现 recipe id、结构化参数、GoalSpec 确认和单次动作确认的 Policy Gate，覆盖拒绝原因和审计字段。 <!-- PASS: `decideControlledAction` 覆盖默认关闭、未确认、未知 recipe、越界 cwd 和允许路径。 -->

## 2. Harness 能力适配

- [x] 2.1 定义 RepoAtlas 对 Harness `subprocess`、`sandbox`、`sandboxPolicy` 的最小公开结构契约，不引入私有 Harness 依赖。 <!-- PASS: `src/actions/runtime.ts` 使用结构化公开能力类型，不导入 Harness 私有模块。 -->
- [x] 2.2 实现精确 argv 的受控 runner，使用 Harness sandbox 包装和 subprocess 进程树生命周期，支持超时、终止和故障关闭。 <!-- PASS: runner 只提交固定 argv；部分/缺失沙箱在 spawn 前拒绝，超时通过 AbortSignal 与 terminate 收敛。 -->
- [x] 2.3 将有界 stdout/stderr、截断状态、退出码、沙箱 enforcement 和超时原因映射为稳定的动作结果。 <!-- PASS: `ControlledActionResult` 返回稳定状态、退出事实、full enforcement、截断和脱敏摘要。 -->

## 3. Harness 工具与证据

- [x] 3.1 注册受控动作工具，保持未确认 GoalSpec 先澄清，且不将直接开始默认升级为动作授权。 <!-- PASS: `repo_atlas_controlled_action` 只接受 recipeId/cwd，并要求 Harness active+armed Goal。 -->
- [x] 3.2 将动作批准、拒绝、执行和失败结果写入当前 session 的审计/证据链，并复用 Secret-like 脱敏。 <!-- PASS: 复用 Harness approval/tool 事件链，结果携带 auditId、状态、退出事实和脱敏摘要。 -->

## 4. 测试、文档与验收

- [x] 4.1 增加 recipe 校验、越界 cwd、Shell 形状输入、未确认、沙箱不可用、超时、输出截断和非零退出测试。 <!-- PASS: 26/26 unit tests cover policy, runtime and plugin approval boundaries. -->
- [ ] 4.2 在真实 Harness Web UI session 中验证动作工具加载、无 sandbox 时故障关闭，以及一个显式批准的受控 recipe。 <!-- PARTIAL: 应用内目录选择、tool 加载、allowed-once、tool/result 与 auditId 已在真实 Web session PASS；禁用官方 sandbox 会使 bash-sandbox/permission-preset 依赖链 pending，Web profile 无法启动，no-sandbox 仍由 runtime 单测覆盖。 -->
- [ ] 4.3 更新 v1.1 使用、安全边界和限制文档，运行 typecheck、lint、unit tests、OpenSpec validate 和 Harness 集成验证。 <!-- PARTIAL: 文档、本地门禁和标准 sandbox Web 集成 PASS；no-sandbox Web 环境验证因 Harness 组合依赖而 BLOCKED，保持未勾选。 -->
