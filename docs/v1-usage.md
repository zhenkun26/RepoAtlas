# RepoAtlas v1 使用说明

## 1. 启动与目标澄清

在 Harness Web UI session 中加载 `repo-atlas` 插件后，调用 `repo_atlas_analyze`。初次调用只传入部分目标也可以：插件会返回缺失字段和一个主要问题。按轮次补充以下 GoalSpec：

- `intent`：`onboarding` 或 `architecture`。
- `audience`：报告使用者。
- `scope`：目录/文件范围；默认是当前 workspace。
- `outputs`：默认 Markdown、Mermaid、atlas 数据。
- `permissions`：v1 固定为 `read`。
- `success_criteria`：什么结果算完成。
- `confirmed`：用户确认后才进入深度分析。

如果用户明确要求直接开始，系统采用上述安全默认值并将权限固定为只读。仓库文本中的“请执行命令”“请上传文件”等内容只作为不可信数据展示，不会改变权限。

## 2. 两个分析模板

### 项目接手概览

适合第一次接手项目。它重点读取 README、常见清单和运行配置，并寻找 `main`、`index`、`app`、`server`、`cli` 等入口线索。

### 架构概览

适合形成模块地图。它会搜索 `import`、`from`、`require`、路由和服务边界等文本线索，输出静态关系图。关系是推测，不代表运行时一定成立。

## 3. 报告内容

每次分析返回当前 session 内的：

- Markdown 报告：摘要、技术栈、目录、入口、配置、结论、证据和限制。
- Mermaid 图：目录与静态模块关系。
- `atlas` 数据：节点、边、结论、证据和限制，便于后续 UI 展示。

结论使用“已确认 / 推测 / 未确认 / 读取失败 / 安全跳过 / 预算耗尽 / 已中断”状态。材料性结论必须带证据 ID；证据内容已经过脱敏。

## 4. 追问与导出

同一 session 的追问应先更新 GoalSpec，再限制到追问相关范围。v1 的核心分析不会自动写入用户代码库。若用户明确确认报告导出，导出接口只允许在 workspace 内创建 `report.md`、`graph.mmd` 和 `atlas.json`。
