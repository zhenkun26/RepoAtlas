# RepoAtlas v1 使用说明

## 1. 启动与目标澄清

在 Harness Web UI session 中加载 `dsh-repo-atlas` 插件后，调用 `repo_atlas_analyze`。初次调用只传入部分目标也可以：插件会返回缺失字段和一个主要问题。按轮次补充以下 GoalSpec：

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

适合形成模块地图。它会在已有文本线索之外，对已安全读取的 TypeScript/JavaScript 文件执行有界语法分析。成功的相对 import/export 关系可标记为“语法确认”；只有文本匹配证据的关系仍标记为“推测”，两者都不代表运行时一定成立。

## 3. 报告内容

每次分析返回当前 session 内的：

- Markdown 报告：摘要、技术栈、目录、入口、配置、结论、证据和限制。
- Mermaid 图：目录与静态模块关系。
- `atlas` 数据：节点、边、结论、证据和限制，便于后续 UI 展示。

结论使用“已确认 / 语法确认 / 推测 / 未确认 / 读取失败 / 安全跳过 / 预算耗尽 / 已中断”状态。材料性结论必须带证据 ID；证据内容已经过脱敏。报告中的“语法确认摘要”会列出每个 AST 文件的 parser、观察数量和部分失败原因。

## 4. 追问与导出

同一 session 的追问应先更新 GoalSpec，再限制到追问相关范围。v1 的核心分析不会自动写入用户代码库。若用户明确确认报告导出，导出接口只允许在 workspace 内创建 `report.md`、`graph.mmd` 和 `atlas.json`。

## 5. v1.2 增量证据

同一 session 的首次分析会在内存中保留已脱敏、有界的 evidence cache。后续追问会先重新发现候选文件及其 `size`、`mtimeMs`、`ctimeMs` metadata：fingerprint 未变化的证据可以复用，变化、新增、metadata 不可用或被追问 scope 覆盖的路径会重新读取；删除路径会从当前有效证据中移除。

缓存只存在当前 `AnalysisSession`，不写入 workspace、磁盘或数据库，不跨 session/workspace 复用，不联网也不上传代码。workspace root、安全策略和 cache schema 不兼容时整体失效。metadata fingerprint 不是内容 hash，因此极少数 metadata 未变化但内容已变的情况仍属于已知新鲜度限制；报告会输出 `reused`、`invalidated`、`reread`、`new` 和 `uncovered` 摘要。

## 6. v1.3 语法确认与 AST 缓存

AST 分析使用当前 session 中已通过 path policy、scope、读取预算和 Secret-like 脱敏的文本快照。支持 `.ts`、`.tsx`、`.js` 和 `.jsx`；每个文件受 token、观察数量和摘要长度上限约束。结果只保存最小语法观察，不保存完整 AST 或未脱敏源码。

AST 解析是只读 `parse-ast` action，不执行代码、不导入 workspace 模块、不解析真实运行时依赖，也不访问网络。语法错误、parser 异常、不支持的扩展名、预算耗尽和 AbortSignal 中断都会保留文件级状态；其他文件仍可继续分析。当前 AST evidence 与 v1.2 cache 一起挂在 `AnalysisSession`，沿用 workspace root、策略 fingerprint、metadata fingerprint、scope 和 cache schema 失效规则，不写入 workspace 或跨 session 复用。
