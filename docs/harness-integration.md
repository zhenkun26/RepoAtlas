# Harness 集成说明

RepoAtlas 适配器位于 `src/harness/plugin.ts`。它导出 `name = "repo-atlas"`、`inject = ["tools"]` 和 `apply(ctx)`，并通过公开的 `ctx.tools.register(...)` 注册一个 `repo_atlas_analyze` 工具。

包根目录同时声明了 `dsh.bundle` 和 `cordis.patch.yml`，因此可以作为 profile bundle 安装；patch 会加载 `repo-atlas/harness`，而不是修改 Harness 核心。工具声明了 Harness 要求的规范 `output.schema` 和文本渲染器，避免只在 fake context 中注册成功、在真实 Loader 中因缺少 canonical output 失败。

适配器把业务逻辑留在 `src/` 的无副作用模块中，Harness 只负责 session 与工具生命周期。接入已安装的 Harness 时，在 Harness checkout 中执行：

```bash
pnpm dsh plugin --profile web add /absolute/path/to/RepoAtlas
pnpm dsh web
```

然后在 Web UI 的“设置 → 插件 → 插件列表”中应看到 `repo-atlas/harness` 为“已挂载、已启用”。未确认的 GoalSpec 仍只返回澄清问题，不启动扫描；插件没有声明 Shell、网络、安装、写入或 Git 工具。
