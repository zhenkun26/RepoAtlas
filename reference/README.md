# DeepSeek Harness Reference

官方源码来源：<https://github.com/deepseek-ai/deepseek-harness>

本目录中的 `deepseek-harness/` 是用于 RepoAtlas 插件兼容性验证的浅克隆 checkout，不属于 RepoAtlas 运行时依赖。

兼容性验收目标记录在 [`harness-compatibility.json`](harness-compatibility.json)：公开 `master` 仅作导航，exact revision、Node 24.x 和 pnpm 11.7.0 才是当前 smoke 合同。该 ignored checkout 如果 ahead/diverged from the manifest pin，不能作为公开兼容性证据；使用 RepoAtlas 根目录的 `scripts/verify-harness-compatibility.mjs` 会 fail closed。

## 官方插件教程

- [第一个插件](deepseek-harness/docs/user/develop/basic/index.md)
- [注册工具](deepseek-harness/docs/user/develop/basic/tool.md)
- [插件配置](deepseek-harness/docs/user/develop/basic/config.md)

## 官方运行说明

- [Harness README](deepseek-harness/README.md)
- [Web UI 使用说明](deepseek-harness/docs/user/guide/index.md)

从源码启动 Web UI：

```bash
cd reference/deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

加载本地插件时，按照官方教程使用绝对路径的 `cordis.yml` patch，并通过 `pnpm dsh web --patch <patch-file>` 启动。

RepoAtlas 当前保留 source-first bundle 安装路径；本地 tarball 检查不等于 npm publication 或普通 Node `.ts` import 支持。真实 Harness smoke 由 RepoAtlas 的手动 workflow 运行，避免把本地参考 checkout 自动当成公开版本。
