# RepoAtlas / 代码星图

RepoAtlas 是一个面向 DeepSeek Harness 的安全只读代码库分析插件 MVP。它先通过多轮 GoalSpec 询问明确目标，再按固定的 `Clarify → Policy Gate → Plan → Read-only ReAct → Verify → Report` 流程，生成带证据索引的 Markdown、Mermaid 和结构化 atlas 数据。

## 当前 v1 能做什么

- 项目接手概览：技术栈、入口线索、核心目录、运行/测试配置和推荐阅读顺序。
- 架构概览：基于静态文本匹配的模块关系推测，所有关系标记为推测并关联来源证据。
- 多轮澄清：每轮只问一个主要问题；允许用户直接开始，但只使用安全默认值。
- 安全只读：默认排除生成物和依赖目录；拒绝路径逃逸、外部符号链接、敏感文件、Shell、网络、安装和 Git 推送。
- 部分结果：二进制、超限、不可读、解析失败、预算耗尽或用户中断都会保留状态，不伪装成完整成功。

## 本地运行

环境要求：Node.js 22+。首次使用先安装项目开发依赖：

```bash
npm install
```

项目将 `typescript` 和 `@types/node` 固定为开发依赖，不要求全局安装 `tsc`。类型检查使用 `tsc --noEmit`，不会生成编译产物：

```bash
npm run typecheck
npm test
npm run lint
npm run validate:openspec
```

Node.js 24 可直接运行仓库中的 TypeScript 测试；`npm run typecheck` 用于检查 `src/` 和 `test/` 的完整类型契约。

实际 Harness 加载使用本项目自带的 bundle manifest：在 Harness checkout 中执行 `pnpm dsh plugin --profile web add /absolute/path/to/RepoAtlas`，再运行 `pnpm dsh web`。适配器入口是 `src/harness/plugin.ts`，只使用公开的 `ctx.tools.register` 与 canonical output 契约；当前仓库没有把 Harness 私有源码或核心 fork 复制进来。

## 直接调用核心 API

```ts
import { createGoalSpec, resolveStart, analyzeRepository, generateReport } from './src/index.ts'

const goal = resolveStart(createGoalSpec({ intent: 'onboarding' }), 'direct')
const session = await analyzeRepository(goal, '/path/to/workspace')
const report = generateReport(session)
console.log(report.markdown)
```

完整说明见：

- [v1 使用说明](docs/v1-usage.md)
- [安全边界](docs/security-boundary.md)
- [限制与后续路线](docs/roadmap.md)
- [Harness 集成说明](docs/harness-integration.md)
