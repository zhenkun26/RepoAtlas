# RepoAtlas / 代码星图

> Safety-first, evidence-backed repository analysis and bounded change-lifecycle plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).
>
> 面向 DeepSeek Harness 的安全优先、证据驱动代码库分析与有界变更生命周期插件。

[![CI](https://github.com/zhenkun26/RepoAtlas/actions/workflows/ci.yml/badge.svg)](https://github.com/zhenkun26/RepoAtlas/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js 22+](https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white)](package.json)

RepoAtlas helps an AI coding harness understand an unfamiliar repository, explain what is directly evidenced versus inferred, and inspect a proposed change through a bounded, auditable lifecycle. The default analysis path is read-only; any controlled action is explicit, approval-gated, and sandbox-aware.

RepoAtlas 帮助 AI coding harness 理解陌生代码库，区分直接证据与推断结论，并在有界、可审计的生命周期中观察变更提案。默认分析路径是只读的；任何受控动作都必须显式启用、经过审批并受 sandbox 约束。

## Why RepoAtlas / 为什么选择 RepoAtlas

Repository analysis should be useful without becoming an unbounded automation surface. RepoAtlas is designed around three principles:

代码库分析应该有用，但不应变成无边界的自动化入口。RepoAtlas 围绕三个原则设计：

- **Evidence before confidence** — bounded file evidence, syntax-confirmed observations, and explicit partial or unknown states instead of invented certainty.<br>**证据优先于确定性**：使用有界文件证据、语法确认观察，以及明确的 partial/unknown 状态，不伪造确定结论。
- **Read-only by default** — repository analysis does not require Shell, network access, dependency installation, source-workspace writes, or Git push.<br>**默认只读**：代码库分析不要求 Shell、网络访问、依赖安装、源工作区写入或 Git push。
- **Lifecycle clarity** — proposals, patch review, verification, commit, landing, recovery, and release readiness remain distinguishable states; an observation is never presented as an applied patch, commit, landing, or release.<br>**生命周期清晰**：proposal、patch review、verification、commit、landing、recovery 和 release readiness 保持为不同状态；观察结果不会被表述为补丁、commit、landing 或 release 已经应用。

## What it provides / 提供什么

### Evidence-backed repository understanding / 基于证据的代码库理解

- Onboarding: technology stack, entry points, important directories, tests, configuration, and a recommended reading order.<br>项目接手：技术栈、入口、重要目录、测试、配置和推荐阅读顺序。
- Architecture observations: bounded TypeScript/JavaScript syntax confirmation combined with clearly labeled text-based inference.<br>架构观察：结合有界 TypeScript/JavaScript 语法确认与明确标注的文本推断。
- Goal clarification: one primary question at a time with safe read-only defaults.<br>目标澄清：每轮只问一个主要问题，并使用安全的只读默认值。
- Incremental analysis: session-only evidence reuse for changed, new, or newly requested scope.<br>增量分析：仅在当前 session 内复用变更、新增或新请求范围的证据。
- Structured atlas data plus Markdown and Mermaid reporting with evidence references.<br>生成带证据引用的结构化 atlas 数据、Markdown 和 Mermaid 报告。

### Bounded change lifecycle / 有界变更生命周期

- Session-only change proposals with explicit targets and digests.<br>仅限当前 session 的变更提案，包含显式目标和 digest。
- Patch review, export, verification, and isolated-worktree commit preparation.<br>补丁审阅、导出、验证和隔离 worktree commit 准备。
- Read-only live state, lifecycle history, recovery guidance, landing preflight, and release preflight observations.<br>提供只读 live state、生命周期历史、恢复建议、landing preflight 和 release preflight 观察。
- Explicit separation between “ready to review” and “already executed”.<br>明确区分“准备审阅”和“已经执行”。

### Harness integration / Harness 集成

- Public `ctx.tools.register` integration through `src/harness/plugin.ts`.<br>通过 `src/harness/plugin.ts` 使用公开的 `ctx.tools.register` 集成。
- `repo-atlas/harness` bundle loading through `cordis.patch.yml`.<br>通过 `cordis.patch.yml` 加载 `repo-atlas/harness` bundle。
- Canonical Harness tool output schemas and text renderers.<br>提供符合 Harness 规范的工具输出 schema 和文本渲染器。
- Real compatibility smoke support for the pinned Harness revision in [reference/harness-compatibility.json](reference/harness-compatibility.json).<br>支持针对 [reference/harness-compatibility.json](reference/harness-compatibility.json) 中 pinned Harness revision 的真实兼容性 smoke。

## Quick start / 快速开始

### Requirements / 环境要求

- Node.js 22 or newer for RepoAtlas development and local checks.<br>RepoAtlas 开发和本地检查需要 Node.js 22 或更高版本。
- A compatible DeepSeek Harness checkout for running the plugin.<br>运行插件需要一个兼容的 DeepSeek Harness checkout。
- pnpm 11.7.0 and Node.js 24.x for the pinned real-Harness smoke contract.<br>pinned 真实 Harness smoke 合同使用 pnpm 11.7.0 和 Node.js 24.x。

### Install from a source checkout / 从源码 checkout 安装

RepoAtlas is currently distributed as a source/plugin bundle. Clone both repositories, install the Harness dependencies, and add the local RepoAtlas checkout:

RepoAtlas 当前以 source/plugin bundle 方式分发。请先 clone 两个仓库、安装 Harness 依赖，再添加本地 RepoAtlas checkout：

```bash
git clone https://github.com/zhenkun26/RepoAtlas.git
git clone https://github.com/deepseek-ai/deepseek-harness.git

cd /absolute/path/to/deepseek-harness
pnpm install
pnpm dsh plugin --profile web add /absolute/path/to/RepoAtlas
pnpm dsh web
```

In the Harness Web UI, the plugin should appear as `repo-atlas/harness`. The plugin does not modify the Harness core; the bundle patch loads the adapter from this repository.

在 Harness Web UI 中，插件应显示为 `repo-atlas/harness`。插件不会修改 Harness 核心；bundle patch 只负责从本仓库加载适配器。

### Run RepoAtlas locally / 在本地运行 RepoAtlas

```bash
cd /absolute/path/to/RepoAtlas
npm ci
npm test
npm run demo
```

The demo and test suite run directly from the TypeScript source under the repository's Node.js toolchain. No global TypeScript installation is required.

demo 和测试套件直接使用仓库 Node.js toolchain 运行 TypeScript 源码，不要求全局安装 TypeScript。

## How it works / 工作方式

The core workflow is intentionally explicit:

核心工作流保持显式和可解释：

```text
Goal → Clarify → Policy Gate → Plan → Read-only ReAct → Verify → Report
```

For change-oriented work, the session can additionally expose bounded lifecycle observations:

对于变更相关工作，session 还可以提供有界的生命周期观察：

```text
Proposal → Patch Review → Verification → Isolated Commit → Landing Preflight → Release Preflight
```

These are separate states, not a promise that code has been generated, applied, committed, landed, released, or published. Any write-capable path requires the relevant explicit configuration, exact digest checks, active Goal/approval context, and the repository's sandbox and postcondition controls.

这些是相互独立的状态，不代表代码已经生成、应用、提交、landing、发布或上传。任何可写路径都必须满足对应的显式配置、精确 digest 检查、active Goal/approval 上下文，以及仓库的 sandbox 和 postcondition 控制。

## Safety model / 安全模型

| Boundary / 边界 | RepoAtlas behavior / RepoAtlas 行为 |
| --- | --- |
| Core analysis<br>核心分析 | Read-only repository inspection with path, content, budget, and sensitive-file policies.<br>遵守路径、内容、预算和敏感文件策略的只读代码库检查。 |
| Evidence and lifecycle state<br>证据与生命周期状态 | Evidence cache, proposal registry, event history, and preflight/readiness assessment are session-only and detached.<br>evidence cache、proposal registry、event history 和 preflight/readiness assessment 仅限当前 session，并以 detached 观察返回。 |
| Controlled actions<br>受控动作 | Opt-in only; fixed recipes, explicit approval, sandbox enforcement, and bounded redacted output are required.<br>仅在 opt-in 后提供；必须使用固定 recipe、显式审批、sandbox 强制和有界脱敏输出。 |
| Git lifecycle<br>Git 生命周期 | Isolated-worktree operations are bounded and local; automatic merge conflict resolution, remote access, push, rollback, and cleanup are not provided.<br>隔离 worktree 操作保持有界且本地化；不提供自动冲突解决、远程访问、push、rollback 或 cleanup。 |
| Network and dependencies<br>网络与依赖 | The RepoAtlas runtime does not fetch repositories, call remote services, install dependencies, or upload code.<br>RepoAtlas runtime 不抓取仓库、不调用远程服务、不安装依赖、不上传代码。 |
| Failure behavior<br>失败行为 | Missing capabilities, denied approval, malformed input, budget exhaustion, and uncertain postconditions fail closed or remain explicitly partial.<br>能力缺失、审批拒绝、输入错误、预算耗尽和不确定 postcondition 会故障关闭，或明确保留为 partial。 |

## Compatibility and support / 兼容性与支持

- Node.js support baseline: **22+**.<br>Node.js 支持基线：**22+**。
- CI quality matrix: **Node.js 22.x and 24.x**.<br>CI 质量矩阵：**Node.js 22.x 和 24.x**。
- Pinned real Harness smoke: revision [`47f943859bef60e4160492346772ded9b24f765a`](https://github.com/deepseek-ai/deepseek-harness/tree/47f943859bef60e4160492346772ded9b24f765a), Node.js 24.x, pnpm 11.7.0.<br>pinned 真实 Harness smoke：revision [`47f943859bef60e4160492346772ded9b24f765a`](https://github.com/deepseek-ai/deepseek-harness/tree/47f943859bef60e4160492346772ded9b24f765a)、Node.js 24.x、pnpm 11.7.0。
- The `master` branch is navigation context, not a compatibility guarantee; the exact revision in the manifest is the evidence contract.<br>`master` 分支仅用于导航，不构成兼容性保证；manifest 中的 exact revision 才是证据合同。
- Support is best-effort and currently has no SLA. Security reports should follow [SECURITY.md](SECURITY.md).<br>当前支持为 best-effort，不提供 SLA；安全问题请按照 [SECURITY.md](SECURITY.md) 报告。

Read the complete [support policy](docs/support-policy.md) and [Harness compatibility manifest](reference/harness-compatibility.json) before integrating RepoAtlas into another workflow.

在将 RepoAtlas 集成到其他工作流前，请阅读完整的 [support policy](docs/support-policy.md) 和 [Harness compatibility manifest](reference/harness-compatibility.json)。

## Distribution and release status / 分发与发布状态

RepoAtlas remains source-first:

RepoAtlas 继续采用 source-first：

- `cordis.patch.yml` and the `dsh.bundle` package metadata define the supported Harness loading path.<br>`cordis.patch.yml` 和 package metadata 中的 `dsh.bundle` 定义受支持的 Harness 加载路径。
- `package.json` intentionally keeps `private: true`.<br>`package.json` 有意保持 `private: true`。
- `npm run verify:source-artifact` is a local packed-install evaluation; it is not an npm publication and does not create an ordinary Node consumer import contract.<br>`npm run verify:source-artifact` 只是本地 packed-install 评估，不是 npm 发布，也不建立普通 Node consumer import 合同。
- No compiled `dist/` distribution is promised.<br>当前不承诺提供编译后的 `dist/` 分发包。
- Git tags, GitHub Releases, and npm publication are separate release decisions. The current project documentation does not claim that an npm package exists.<br>Git tag、GitHub Release 和 npm publication 是相互独立的发布决策；当前项目文档不声称存在 npm 包。

The current reviewed source candidate is `0.1.1` and remains unreleased. The immutable `v0.1.0` tag points to the earlier revision `455dbb61d5cabe032e3497ba4d9eeb9c39584662`; it must not be moved or overwritten. No GitHub Release is claimed for the `0.1.1` candidate.<br>当前审阅中的源码候选版本是 `0.1.1`，尚未发布。不可变的 `v0.1.0` tag 指向较早的 revision `455dbb61d5cabe032e3497ba4d9eeb9c39584662`，不得移动或覆盖。当前不声称 `0.1.1` 候选版本已有 GitHub Release。

The manual [release process](docs/release-process.md) and [release checklist](docs/release-checklist.md) distinguish candidate readiness from actual release state. A green preflight is advisory evidence; it does not create a tag, GitHub Release, npm publication, or deployment.

手动 [release process](docs/release-process.md) 和 [release checklist](docs/release-checklist.md) 区分候选版本就绪与实际发布状态。绿色 preflight 只是 advisory evidence，不会创建 tag、GitHub Release、npm publication 或 deployment。

## Direct core API / 直接调用核心 API

RepoAtlas can also be used directly from a source checkout:

RepoAtlas 也可以直接从源码 checkout 调用：

```ts
import { createGoalSpec, resolveStart, analyzeRepository, generateReport } from './src/index.ts'

const goal = resolveStart(createGoalSpec({ intent: 'onboarding' }), 'direct')
const session = await analyzeRepository(goal, '/path/to/workspace')
const report = generateReport(session)

console.log(report.markdown)
```

Direct API usage still follows the same evidence, path, sensitive-content, and budget policies. Importing the raw `.ts` entry point from an installed `node_modules` package is not part of the current support contract.

直接 API 调用仍然遵守相同的证据、路径、敏感内容和预算策略。从已安装的 `node_modules` 包中直接 import 原始 `.ts` entry point 不属于当前支持合同。

## Development and verification / 开发与验证

```bash
npm ci
npm run typecheck
npm test
npm run lint
npm run verify:source-artifact
npm run validate:openspec
npm run verify:release-preflight
git diff --check
```

The release preflight is a local, read-only candidate check. It intentionally reports `blocked` when the worktree, OpenSpec state, release documents, or human release gates are not ready; it never performs a tag, release, publish, push, deployment, or cleanup operation.

release preflight 是本地只读候选检查。当工作树、OpenSpec 状态、发布文档或人工发布门槛未就绪时，它会按设计返回 `blocked`；它不会执行 tag、release、publish、push、deployment 或 cleanup。

## Open-source governance / 开源治理

RepoAtlas is released under the [MIT License](LICENSE). Reuse, modification, and redistribution are allowed when the MIT copyright notice, license text, and disclaimer are retained.

RepoAtlas 使用 [MIT License](LICENSE) 发布。保留 MIT 版权声明、许可证文本和免责声明后，允许使用、修改和再分发。

When publicly citing, integrating, documenting, or deriving from RepoAtlas, please identify **RepoAtlas / 代码星图** and link to the canonical source repository: <https://github.com/zhenkun26/RepoAtlas>. This provenance request is maintained separately in [NOTICE.md](NOTICE.md) and does not add legal conditions to the MIT License.

在公开引用、集成、文档说明或基于 RepoAtlas 衍生时，请明确标注 **RepoAtlas / 代码星图**，并链接到 canonical source repository：<https://github.com/zhenkun26/RepoAtlas>。这项来源说明单独维护在 [NOTICE.md](NOTICE.md) 中，不会向 MIT License 增加额外法律条件。

- Contributions / 贡献：[CONTRIBUTING.md](CONTRIBUTING.md)
- Security reports / 安全报告：[SECURITY.md](SECURITY.md)
- Code of conduct / 行为规范：[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## Documentation / 文档导航

- [v1 usage / v1 使用说明](docs/v1-usage.md)
- [Harness integration / Harness 集成](docs/harness-integration.md)
- [Security boundary / 安全边界](docs/security-boundary.md)
- [Support policy / 支持策略](docs/support-policy.md)
- [Source-first release process / 源码优先发布流程](docs/release-process.md)
- [Public release checklist / 公开发布清单](docs/release-checklist.md)
- [Roadmap and limitations / 路线与限制](docs/roadmap.md)
- [Attribution notice / 来源说明](NOTICE.md)
