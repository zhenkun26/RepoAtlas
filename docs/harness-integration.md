# Harness 集成说明

RepoAtlas 适配器位于 `src/harness/plugin.ts`。它导出 `name = "repo-atlas"`、`inject = ["tools"]` 和 `apply(ctx)`，并通过公开的 `ctx.tools.register(...)` 注册一个 `repo_atlas_analyze` 工具。只有配置显式启用 `controlledActions` 时，才额外注册 `repo_atlas_controlled_action`。

包根目录同时声明了 `dsh.bundle` 和 `cordis.patch.yml`，因此可以作为 profile bundle 安装；patch 会加载 `repo-atlas/harness`，而不是修改 Harness 核心。工具声明了 Harness 要求的规范 `output.schema` 和文本渲染器，避免只在 fake context 中注册成功、在真实 Loader 中因缺少 canonical output 失败。

适配器把业务逻辑留在 `src/` 的无副作用模块中，Harness 只负责 session、审批与工具生命周期。受控动作通过 `ctx.get()` 读取公开的 `approval`、`goals`、`sandboxPolicy`、`sandbox` 和 `subprocess` 能力；任何能力缺失都保持工具可见但执行故障关闭。接入已安装的 Harness 时，在 Harness checkout 中执行：

```bash
pnpm dsh plugin --profile web add /absolute/path/to/RepoAtlas
pnpm dsh web
```

然后在 Web UI 的“设置 → 插件 → 插件列表”中应看到 `repo-atlas/harness` 为“已挂载、已启用”。未确认的 GoalSpec 仍只返回澄清问题，不启动扫描；受控动作还需要 active+armed Goal 和一次性用户审批。插件没有声明自由 Shell、网络、安装、写入或 Git 工具。

环境适配反馈：官方 Web profile 的 `bash-sandbox` 和 permission preset 依赖 `sandbox` 能力。直接禁用 `sandbox` 会让 profile 在启动阶段保持 pending 并 fail closed，无法进入可执行 session；因此“缺少 sandbox 时受控动作返回 `sandbox-unavailable`”已在 RepoAtlas runtime/plugin 边界测试覆盖，真实 Web 端需 Harness 提供可启动的最小无 sandbox 组合后再补验。
