# RepoAtlas / 代码星图

RepoAtlas 是一个面向 DeepSeek Harness 的安全只读代码库分析插件。它先通过多轮 GoalSpec 询问明确目标，再按固定的 `Clarify → Policy Gate → Plan → Read-only ReAct → Verify → Report` 流程，生成带证据索引的 Markdown、Mermaid 和结构化 atlas 数据；当前公开准备工作采用源码仓库优先的分发方式。

## 当前 v1 能做什么

- 项目接手概览：技术栈、入口线索、核心目录、运行/测试配置和推荐阅读顺序。
- 架构概览：结合受限 TypeScript/JavaScript 语法观察与静态文本匹配；AST 直接支持的关系标记为“语法确认”，文本-only 关系仍标记为“推测”。
- v1.3 语法确认：仅分析已确认范围内、通过读取和脱敏的 `.ts`、`.tsx`、`.js`、`.jsx` 文本；输出有界的 import/export、函数、类、变量和有限调用观察。
- 多轮澄清：每轮只问一个主要问题；允许用户直接开始，但只使用安全默认值。
- 安全只读：默认排除生成物和依赖目录；拒绝路径逃逸、外部符号链接、敏感文件、Shell、网络、安装和 Git 推送。
- 部分结果：二进制、超限、不可读、解析失败、预算耗尽或用户中断都会保留状态，不伪装成完整成功。
- AST 安全边界：不执行代码、不加载模块、不解析运行时依赖、不访问网络；不支持的语言、语法错误和 AST 预算不足会显式保留为未分析或失败状态。

## 当前 v2 能做什么

- 在当前 session 内创建、确认、审阅、验证和导出有界的变更提案；补丁只接受调用方明确提供的 bounded unified diff，不自动生成代码。
- 在隔离 worktree 中执行经过 Goal、approval、digest 和状态检查的 patch apply、verification、local commit 与 source fast-forward landing；这些动作不 push、不联网、不部署、不自动清理。
- 通过 `inspect`、`list`、`history`、`inspect-live`、`inspect-recovery`、`inspect-landing` 和 `inspect-release` 查看当前 session 的生命周期快照、事件和本地关系；这些结果都是 detached、bounded、session-only observation，不是授权或已执行结果。
- 所有 evidence cache、proposal registry、event history 和 preflight/readiness assessment 都在进程结束时丢弃，不跨 session、不写 workspace、不上传代码。

## 开源化状态

当前仓库是源码优先的公开准备基线：根目录包含 MIT 工作许可证、贡献/安全/行为规范和变更记录，GitHub Actions 在 Node.js 22/24 上运行质量门禁。`package.json` 仍保持 `private: true`，因此当前不宣称 npm 发布包、编译产物或首个公开 release；分发策略、真实 Harness smoke test 和首个 tag 由后续版本单独决定。详见 [公开发布 checklist](docs/release-checklist.md) 和 [后续路线](docs/roadmap.md)。

## 授权与来源说明

RepoAtlas 采用 MIT License，允许使用、修改和再分发，但再分发时必须保留许可证通知和免责声明。公开引用、集成说明、文章、论文或衍生项目中请明确标注 **RepoAtlas / 代码星图**，并链接来源仓库 <https://github.com/zhenkun26/RepoAtlas>。这项来源说明是项目的 provenance policy，不改变 MIT License 的法律条款；详见 [NOTICE](NOTICE.md)。

## 本地运行

环境要求：Node.js 22+。首次使用先按锁文件安装项目开发依赖：

```bash
npm ci
```

项目将 `typescript` 和 `@types/node` 固定为开发依赖，不要求全局安装 `tsc`。类型检查使用 `tsc --noEmit`，不会生成编译产物：

```bash
npm run typecheck
npm test
npm run lint
npm run validate:openspec
git diff --check
```

Node.js 24 可直接运行仓库中的 TypeScript 测试；`npm run typecheck` 用于检查 `src/` 和 `test/` 的完整类型契约。

如果本机没有 `openspec` CLI，OpenSpec 门禁可以通过固定版本的临时 CLI 执行：

```bash
npx --yes @fission-ai/openspec@1.7.0 validate --all --strict --no-interactive
```

实际 Harness 加载使用本项目自带的 bundle manifest：在 Harness checkout 中执行 `pnpm dsh plugin --profile web add /absolute/path/to/RepoAtlas`，再运行 `pnpm dsh web`。适配器入口是 `src/harness/plugin.ts`，只使用公开的 `ctx.tools.register` 与 canonical output 契约；当前仓库没有把 Harness 私有源码或核心 fork 复制进来。当前公开基线尚未把真实 Harness checkout 纳入 RepoAtlas CI，不能把 fake-context 测试表述为真实 Harness 集成验收。

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
- [公开贡献说明](CONTRIBUTING.md)
- [安全报告](SECURITY.md)
- [授权与来源说明](NOTICE.md)
- [公开发布 checklist](docs/release-checklist.md)
