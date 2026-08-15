## Context

See `proposal.md` for the motivation. 当前分析管线由 `analyzeRepository` 创建 scanner、读取文件并从当前 evidence 推导地图；`refineAndAnalyze` 已经把同一 session 的旧 evidence 传回，但 scanner 仍会按新请求重新读取覆盖范围。现有 path policy、敏感内容脱敏、读取预算和部分失败状态必须继续作为唯一安全边界。

## Goals / Non-Goals

**Goals:**

- 在同一 session 内为每个相对路径维护可验证的 metadata fingerprint 与已脱敏、有界 evidence 快照。
- 让 follow-up 在完成候选路径/metadata 发现后，只对新增、变化、metadata 不可用或被追问覆盖的路径进行全文读取。
- 用当前有效 evidence 重建现有 atlas 结构，并返回 reused、invalidated、reread、new 和 uncovered 摘要。
- 让缓存命中、失效和更新继续受现有 workspace、path policy、预算、脱敏和 AbortSignal 约束。

**Non-Goals:**

- 不做跨 session、磁盘、数据库、远程或团队共享缓存。
- 不通过缓存绕过敏感文件拒绝、路径检查、读取预算、动作预算或任何 Harness 权限边界。
- 不在 v1.2 引入内容 hash 的全量读取、语言 AST、后台 watcher、自动 Git 操作或新的外部依赖。

## Decisions

1. **用 metadata fingerprint 做增量判定。** 每个缓存条目使用规范化相对路径、文件 size、`mtimeMs` 与可用的 `ctimeMs`；任一必需 metadata 缺失或无法稳定序列化时按失效处理。选择 metadata 是因为它能避免为检测变化而重新读取所有文件；content hash 留作后续需要更强新鲜度保证时的独立变更。

2. **缓存挂在 `AnalysisSession`，不引入持久化层。** 新增 session-local cache 与 incremental summary 数据，`refineAndAnalyze` 复用它；`AnalysisReport` 只暴露有界摘要和当前有效 evidence，不序列化内部缓存快照。没有缓存的旧 session 仍走现有全量路径。

3. **发现与读取分离。** scanner 仍遍历 workspace 并获取候选文件 metadata，但读取阶段先按 fingerprint、scope 和安全配置筛选目标。未变化路径直接复用；变化、新增、metadata 不可用或追问覆盖的路径重新走现有 `readText`，因此所有敏感路径、脱敏和预算逻辑保持单一入口。

4. **按路径替换证据，再整体重建地图。** 对失效路径先移除旧 evidence，再合并本轮读取结果和仍有效的缓存 evidence；地图、结论和证据索引从这个有效集合重新推导。这样不需要维护边的增量删除算法，也不会让旧路径继续贡献陈旧关系。

5. **scope 是覆盖范围而不是全局缓存键。** 追问 scope 收窄时保留范围外未变化 evidence 以维持当前地图的完整性；scope 扩大时只补充新覆盖范围。workspace root、安全策略和 cache schema version 变化则整体丢弃缓存，避免旧策略产生的证据继续生效。

6. **复用不消耗新的全文读取预算，但不改变预算语义。** candidate discovery 仍受候选文件预算约束，重新读取仍受单文件、总字节和动作预算约束；缓存自身只保存已有的脱敏、有界 evidence。预算或 AbortSignal 中断时保留可复用部分并记录 uncovered/partial 状态。

## Risks / Trade-offs

- [metadata 与内容变化不完全等价] → 同时使用 size、mtimeMs 和 ctimeMs；metadata 不可用即失效；后续若需要更强保证再单独引入 hash/refresh 方案。
- [session 内缓存占用内存] → 复用现有 evidence 的有界内容与扫描预算，不复制未脱敏原文，并在 cache schema 中限制条目和摘要大小。
- [路径删除或重命名留下陈旧关系] → 每轮以当前 discovery 结果过滤缓存路径，再从有效 evidence 全量重建地图。
- [scope 追问误删上下文] → scope 只决定本轮新增读取覆盖，范围外未变化 evidence 仍进入当前地图，并在摘要中区分 uncovered 与 reused。
- [安全配置改变后复用旧证据] → 将 workspace root、path/sensitive policy、预算相关版本和 cache schema version 纳入兼容性检查，失败则整体失效。

## Migration Plan

1. 先增加可选的 session cache/summary 字段；没有这些字段的旧 session 按首次全量分析处理。
2. 为首次分析、未变化追问、变化文件、scope 变更、缓存不兼容、预算耗尽和中断增加 fixture 与回归测试。
3. 仅在本地 session 内启用，观察结果摘要与证据 id 稳定性；不需要数据迁移或外部服务部署。
4. 回滚时移除增量路径并恢复旧的全量读取逻辑；旧 session 数据无需清理，因为 v1.2 不产生持久化缓存。
