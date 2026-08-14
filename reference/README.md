# DeepSeek Harness Reference

官方源码来源：<https://github.com/deepseek-ai/deepseek-harness>

本目录中的 `deepseek-harness/` 是用于 RepoAtlas 插件兼容性验证的浅克隆 checkout，不属于 RepoAtlas 运行时依赖。

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
