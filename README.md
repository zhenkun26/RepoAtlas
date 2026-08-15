# RepoAtlas / 代码星图

> Safety-first, evidence-backed repository analysis and bounded change-lifecycle plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).
>
> 面向 DeepSeek Harness 的安全优先、证据驱动代码库分析与有界变更生命周期插件。

[![CI](https://github.com/zhenkun26/RepoAtlas/actions/workflows/ci.yml/badge.svg)](https://github.com/zhenkun26/RepoAtlas/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js 22+](https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white)](package.json)

RepoAtlas helps an AI coding harness understand an unfamiliar repository, explain what is directly evidenced versus inferred, and inspect a proposed change through a bounded, auditable lifecycle. The default analysis path is read-only; any controlled action is explicit, approval-gated, and sandbox-aware.

## Why RepoAtlas

Repository analysis should be useful without becoming an unbounded automation surface. RepoAtlas is designed around three principles:

- **Evidence before confidence** — bounded file evidence, syntax-confirmed observations, and explicit partial or unknown states instead of invented certainty.
- **Read-only by default** — repository analysis does not require Shell, network access, dependency installation, source-workspace writes, or Git push.
- **Lifecycle clarity** — proposals, patch review, verification, commit, landing, recovery, and release readiness remain distinguishable states; an observation is never presented as an applied patch, commit, landing, or release.

## What it provides

### Evidence-backed repository understanding

- Onboarding: technology stack, entry points, important directories, tests, configuration, and a recommended reading order.
- Architecture observations: bounded TypeScript/JavaScript syntax confirmation combined with clearly labeled text-based inference.
- Goal clarification: one primary question at a time with safe read-only defaults.
- Incremental analysis: session-only evidence reuse for changed, new, or newly requested scope.
- Structured atlas data plus Markdown and Mermaid reporting with evidence references.

### Bounded change lifecycle

- Session-only change proposals with explicit targets and digests.
- Patch review, export, verification, and isolated-worktree commit preparation.
- Read-only live state, lifecycle history, recovery guidance, landing preflight, and release preflight observations.
- Explicit separation between “ready to review” and “already executed”.

### Harness integration

- Public `ctx.tools.register` integration through `src/harness/plugin.ts`.
- `repo-atlas/harness` bundle loading through `cordis.patch.yml`.
- Canonical Harness tool output schemas and text renderers.
- Real compatibility smoke support for the pinned Harness revision in [reference/harness-compatibility.json](reference/harness-compatibility.json).

## Quick start

### Requirements

- Node.js 22 or newer for RepoAtlas development and local checks.
- A compatible DeepSeek Harness checkout for running the plugin.
- pnpm 11.7.0 and Node.js 24.x for the pinned real-Harness smoke contract.

### Install from a source checkout

RepoAtlas is currently distributed as a source/plugin bundle. Clone both repositories, install the Harness dependencies, and add the local RepoAtlas checkout:

```bash
git clone https://github.com/zhenkun26/RepoAtlas.git
git clone https://github.com/deepseek-ai/deepseek-harness.git

cd /absolute/path/to/deepseek-harness
pnpm install
pnpm dsh plugin --profile web add /absolute/path/to/RepoAtlas
pnpm dsh web
```

In the Harness Web UI, the plugin should appear as `repo-atlas/harness`. The plugin does not modify the Harness core; the bundle patch loads the adapter from this repository.

### Run RepoAtlas locally

```bash
cd /absolute/path/to/RepoAtlas
npm ci
npm test
npm run demo
```

The demo and test suite run directly from the TypeScript source under the repository's Node.js toolchain. No global TypeScript installation is required.

## How it works

The core workflow is intentionally explicit:

```text
Goal → Clarify → Policy Gate → Plan → Read-only ReAct → Verify → Report
```

For change-oriented work, the session can additionally expose bounded lifecycle observations:

```text
Proposal → Patch Review → Verification → Isolated Commit → Landing Preflight → Release Preflight
```

These are separate states, not a promise that code has been generated, applied, committed, landed, released, or published. Any write-capable path requires the relevant explicit configuration, exact digest checks, active Goal/approval context, and the repository's sandbox and postcondition controls.

## Safety model

| Boundary | RepoAtlas behavior |
| --- | --- |
| Core analysis | Read-only repository inspection with path, content, budget, and sensitive-file policies. |
| Evidence and lifecycle state | Evidence cache, proposal registry, event history, and preflight/readiness assessment are session-only and detached. |
| Controlled actions | Opt-in only; fixed recipes, explicit approval, sandbox enforcement, and bounded redacted output are required. |
| Git lifecycle | Isolated-worktree operations are bounded and local; automatic merge conflict resolution, remote access, push, rollback, and cleanup are not provided. |
| Network and dependencies | The RepoAtlas runtime does not fetch repositories, call remote services, install dependencies, or upload code. |
| Failure behavior | Missing capabilities, denied approval, malformed input, budget exhaustion, and uncertain postconditions fail closed or remain explicitly partial. |

## Compatibility and support

- Node.js support baseline: **22+**.
- CI quality matrix: **Node.js 22.x and 24.x**.
- Pinned real Harness smoke: revision [`47f943859bef60e4160492346772ded9b24f765a`](https://github.com/deepseek-ai/deepseek-harness/tree/47f943859bef60e4160492346772ded9b24f765a), Node.js 24.x, pnpm 11.7.0.
- The `master` branch is navigation context, not a compatibility guarantee; the exact revision in the manifest is the evidence contract.
- Support is best-effort and currently has no SLA. Security reports should follow [SECURITY.md](SECURITY.md).

Read the complete [support policy](docs/support-policy.md) and [Harness compatibility manifest](reference/harness-compatibility.json) before integrating RepoAtlas into another workflow.

## Distribution and release status

RepoAtlas remains source-first:

- `cordis.patch.yml` and the `dsh.bundle` package metadata define the supported Harness loading path.
- `package.json` intentionally keeps `private: true`.
- `npm run verify:source-artifact` is a local packed-install evaluation; it is not an npm publication and does not create an ordinary Node consumer import contract.
- No compiled `dist/` distribution is promised.
- Git tags, GitHub Releases, and npm publication are separate release decisions. The current project documentation does not claim that an npm package exists.

The manual [release process](docs/release-process.md) and [release checklist](docs/release-checklist.md) distinguish candidate readiness from actual release state. A green preflight is advisory evidence; it does not create a tag, GitHub Release, npm publication, or deployment.

## Direct core API

RepoAtlas can also be used directly from a source checkout:

```ts
import { createGoalSpec, resolveStart, analyzeRepository, generateReport } from './src/index.ts'

const goal = resolveStart(createGoalSpec({ intent: 'onboarding' }), 'direct')
const session = await analyzeRepository(goal, '/path/to/workspace')
const report = generateReport(session)

console.log(report.markdown)
```

Direct API usage still follows the same evidence, path, sensitive-content, and budget policies. Importing the raw `.ts` entry point from an installed `node_modules` package is not part of the current support contract.

## Development and verification

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

## Open-source governance

RepoAtlas is released under the [MIT License](LICENSE). Reuse, modification, and redistribution are allowed when the MIT copyright notice, license text, and disclaimer are retained.

When publicly citing, integrating, documenting, or deriving from RepoAtlas, please identify **RepoAtlas / 代码星图** and link to the canonical source repository: <https://github.com/zhenkun26/RepoAtlas>. This provenance request is maintained separately in [NOTICE.md](NOTICE.md) and does not add legal conditions to the MIT License.

- Contributions: [CONTRIBUTING.md](CONTRIBUTING.md)
- Security reports: [SECURITY.md](SECURITY.md)
- Code of conduct: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## Chinese summary

RepoAtlas 是一个面向 DeepSeek Harness 的安全只读代码库分析插件。它通过 GoalSpec 明确目标，按 `Clarify → Policy Gate → Plan → Read-only ReAct → Verify → Report` 生成带证据索引的 Markdown、Mermaid 和结构化 atlas 数据，并提供 session-only 的变更提案、补丁审阅、验证、生命周期历史、恢复建议与 release preflight 观察。

核心原则是：默认只读、证据优先、边界显式、失败关闭。项目当前采用源码优先分发，暂不提供 npm 包或编译后的 `dist/`，也不会把 proposal、preflight 或 landing relation 误报为补丁、commit、landing 或 release 已应用。

## Documentation

- [v1 usage](docs/v1-usage.md)
- [Harness integration](docs/harness-integration.md)
- [Security boundary](docs/security-boundary.md)
- [Support policy](docs/support-policy.md)
- [Source-first release process](docs/release-process.md)
- [Public release checklist](docs/release-checklist.md)
- [Roadmap and limitations](docs/roadmap.md)
- [Attribution notice](NOTICE.md)
