## Context

RepoAtlas v1 的 `Policy Gate` 只允许 list/read/search/parse-config，Harness 真实运行环境已经提供 `subprocess`、`sandbox` 和逐会话沙箱策略能力。v1.1 需要消费这些公开能力，而不是在 RepoAtlas 内部重新实现进程管理或绕过 Harness 的安全边界。

## Goals / Non-Goals

**Goals:**

- 用可信配置声明固定 argv recipe，并提供一次性、可审计的动作批准。
- 复用 Harness 的进程树管理、沙箱包装、超时终止和环境变量清理能力。
- 保持动作输入结构化、输出有界且经过现有 Secret-like 脱敏逻辑。
- 在没有完整沙箱能力时故障关闭，并用单元测试和真实 Web UI 加载验证契约。

**Non-Goals:**

- 不支持模型自由传入 Shell 字符串、解释器脚本或任意可执行文件。
- 不开放网络、依赖安装、Git push、远程仓库访问或自动修复。
- 不在 v1.1 首个 slice 中实现长期终端会话、后台任务队列或跨 session 缓存。

## Decisions

1. **Recipe 优先于原始命令。** 配置保存固定 argv 和预算，模型只选择 recipe id；相比任意命令加黑名单，这能减少参数绕过和 Shell 注入面。
2. **精确 argv，不使用 Shell。** 动作 runner 只把配置和结构化参数拼成 argv，再交给 Harness sandbox/subprocess；相比 `shell.run`，它避免引号、管道、重定向和命令替换的隐式语义。
3. **沙箱由 Harness 负责。** RepoAtlas 只依赖公开结构化能力；相比直接导入 `node:child_process`，这能复用平台隔离、进程树终止和 provider 的 fail-closed 语义。
4. **默认禁用、双重确认。** 配置未启用或 GoalSpec/本次动作任一未确认时不执行；相比一次全局开关，这能把权限绑定到单个意图和单个调用。
5. **输出先限额再脱敏再返回。** 进程输出不能无限进入模型上下文；捕获预算和现有 `redactSecretLike` 共同限制泄露面，并明确记录截断。
6. **授权事实由 Harness 提供。** 受控工具不接受模型传入的确认布尔值；它只把 `ctx.goals.get(agent)` 返回的 active+armed Goal 视为宿主确认事实，并通过 `ctx.approval.request()` 获取一次性 `allowed-once`。直接开始只读分析不会自动产生该事实。
7. **复用 Harness 审计。** 审批请求/结果由 Harness 写入 `approval/asked`/`approval/decided`，工具调用/结果由 Harness 写入 `tool/call`/`tool/result`；RepoAtlas 只在结果中携带关联 `auditId` 和脱敏摘要，不增加未经官方词汇注册的 session event。

## Risks / Trade-offs

- [recipe 仍可能调用有副作用的项目脚本] → 默认禁用；仅允许可信配置声明，并要求逐次确认与沙箱模式。
- [平台没有完整 sandbox provider] → 禁止降级执行，返回 `sandbox-unavailable`，并在 Web UI 验证故障关闭。
- [命令输出包含密钥或个人数据] → 使用有限捕获、环境清理和 Secret-like 脱敏；完整输出不进入 RepoAtlas 报告。
- [子进程产生后台子进程] → 只使用 Harness subprocess 的受管进程树和终止语义，超时后等待树收敛。

## Migration Plan

1. 先发布配置模型、策略和 fake runtime 测试；默认 `enabled = false`，对现有 v1 用户无行为变化。
2. 接入 Harness tool 与 capability adapter，在缺少 sandbox/subprocess 时保持工具可见但执行故障关闭。
3. 通过真实 Web UI session 验证 recipe 注册、拒绝路径、成功/超时路径和审计输出。
4. 回滚时卸载 v1.1 bundle 或关闭配置；不需要迁移用户文件和持久化数据。

## Open Questions

无。recipe schema、确认层级、沙箱故障语义和 v1.1 首个 slice 的非目标已在 proposal/spec 中固定。
