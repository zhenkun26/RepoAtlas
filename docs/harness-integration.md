# Harness 集成说明

RepoAtlas 适配器位于 `src/harness/plugin.ts`。它导出 `name = "repo-atlas"`、`inject = ["tools"]` 和 `apply(ctx)`，并通过公开的 `ctx.tools.register(...)` 注册 `repo_atlas_analyze` 与 `repo_atlas_change_proposal`。后者支持 proposal lifecycle、v2.11 的只读 `inspect-release` readiness、v2.10 的只读 `inspect-landing` preflight、v2.9 的 read-only `inspect-recovery`、v2.8 的 session-only `history`、v2.7 的 read-only `inspect-live`、v2.6 的 bounded session-only `list`、v2.5 的 session-only `inspect`、`prepare-patch`、`review-patch`、`export-patch`、`confirm-patch`、`reject-patch`、`verify-patch`、v2.3 的 `prepare-commit`、`confirm-commit`、`reject-commit`，以及 v2.4 的 `prepare-landing`、`confirm-landing`、`reject-landing`。只有配置显式启用 `controlledActions` 时，才额外注册 `repo_atlas_controlled_action`。

包根目录同时声明了 `dsh.bundle` 和 `cordis.patch.yml`，因此可以作为 profile bundle 安装；patch 会加载 `repo-atlas/harness`，而不是修改 Harness 核心。工具声明了 Harness 要求的规范 `output.schema` 和文本渲染器，避免只在 fake context 中注册成功、在真实 Loader 中因缺少 canonical output 失败。

适配器把业务逻辑留在 `src/` 的 session-only 模块中，Harness 只负责 session、审批与工具生命周期。受控动作和 patch verification 通过 `ctx.get()` 读取公开的 `approval`、`goals`、`sandboxPolicy`、`sandbox` 和 `subprocess` 能力；verification 的执行 root 由 session-owned worktree 提供，不能由工具输入覆盖。v2.3 commit authorizer 与 v2.4 landing authorizer 只读取 `goals` 与 `approval`，要求 active+armed Goal、live agent、tool call id 和一次性 `allowed-once`，不直接执行 Git。landing 的 source path、base revision 和 target revision 由 session manager 派生，工具输入不能覆盖。任何能力缺失、recipe 非 read-only、resolved root 不匹配或 approval 被拒绝都保持工具可见但执行故障关闭。接入已安装的 Harness 时，在 Harness checkout 中执行：

```bash
pnpm dsh plugin --profile web add /absolute/path/to/RepoAtlas
pnpm dsh web
```

然后在 Web UI 的“设置 → 插件 → 插件列表”中应看到 `repo-atlas/harness` 为“已挂载、已启用”。未确认的 GoalSpec 仍只返回澄清问题，不启动扫描；受控动作和 patch verification 还需要 active+armed Goal 和一次性用户审批。patch export 只返回当前 session result，不写导出文件；`inspect` 只返回当前 session memory 的 detached proposal snapshot，`list` 只返回 bounded summary，`history` 只返回当前 manager memory 中实际状态转移的 bounded detached events，`inspect-recovery` 只从 registry 返回下一步建议，不是授权或执行，`inspect-live` 只读取本地 source/worktree 状态并返回独立 observation，`inspect-landing` 只读取已创建 local commit 与 source 的 bounded 本地关系并返回 preflight observation，`inspect-release` 只读取当前 proposal 的 release 相关状态与 session-owned worktree 的 bounded read-only facts，并返回 advisory readiness observation，不刷新 registry、不请求审批、不执行写操作。插件没有声明自由 Shell、网络、安装、写入源 workspace、commit、merge 或 Git push 工具。

环境适配反馈：官方 Web profile 的 `bash-sandbox` 和 permission preset 依赖 `sandbox` 能力。只禁用 `sandbox` 会让依赖链在启动阶段保持 pending 并 fail closed，无法进入可执行 session；这属于 Harness 组合适配限制，而不是 RepoAtlas 动作逻辑应绕过的安全边界。验收时采用了隔离的最小无 shell 组合：同时停用 `sandbox`、`bash-sandbox`、`permission`、`tool-bash`，保留 `subprocess`、`sandbox-policy`、`approval`，并挂载只含 persona 与 Goal 工具的自定义 agent preset。该组合可以启动真实 Web session；在 active+armed Goal 和 `allowed-once` 审批后，动作返回 `sandbox-unavailable` 且 stdout 为空，保持 fail-closed、未进入 spawn。v2.3 commit 不依赖 sandbox subprocess，v2.4 landing 只调用内部固定 Git adapter，但二者仍依赖同一 Harness Goal/approval 约束。默认 profile 未修改。

## 公开分发边界

RepoAtlas 当前按源码 checkout 分发：使用仓库根目录的 `cordis.patch.yml` 加载本地插件，不提供已发布的 npm 包或 `dist/` 编译产物。v2.13 的 `npm run verify:source-artifact` 只验证本地 tarball 能在隔离 consumer 中离线安装、保留 source entry point/metadata 和 bundle patch；它不提供普通 Node consumer 的 `.ts` import 契约，也不执行 npm publish。Node 24 的 built-in TypeScript stripping 会拒绝从 `node_modules` 加载 `.ts`，因此这项限制是当前 source/plugin bundle 决策的一部分。

真实 Harness 兼容目标固定在 [reference/harness-compatibility.json](../reference/harness-compatibility.json)：公开仓库 `deepseek-ai/deepseek-harness` 的 `master` 分支仅作导航，`47f943859bef60e4160492346772ded9b24f765a` 才是验收 revision，配套 Node 24.x 与 pnpm 11.7.0。忽略的 `reference/deepseek-harness/` 是用户本地 checkout；只有 HEAD 与该 revision 完全一致时才可作为本地 smoke 输入，ahead/diverged checkout 必须 fail closed。

在满足 pin 的 Harness checkout 中，可在 RepoAtlas 根目录运行 `REPO_ATLAS_HARNESS_ROOT=/absolute/path/to/deepseek-harness node scripts/verify-harness-compatibility.mjs`。它使用固定 `pnpm` argv、`shell:false` 和 task-owned 临时 `DSH_HOME`，验证 `plugin add`、`--dump-config` 中的 `repo-atlas/harness` 和 `dsh web --help`；不会写 RepoAtlas source workspace。对应的 GitHub Actions workflow 只有 `workflow_dispatch`，默认 PR/push CI 不会 clone 或安装外部 Harness。

现有 fake-context/plugin contract tests 证明公开注册契约，但不等价于真实 Harness checkout 的集成验收；在手动 workflow 有成功且可审阅的 run 之前，不要把 package metadata、bundle manifest、本地 artifact pass 或 readiness observation 误解为已经完成发布、真实 Harness 支持或授权。
