## 1. Session cache contract

- [x] 1.1 增加 session-local evidence cache、metadata fingerprint 和增量摘要类型，保持旧 `AnalysisSession`/`AnalysisReport` 调用方可兼容。
- [x] 1.2 实现 workspace root、安全配置、cache schema version 和 scope 覆盖范围的兼容性判定，覆盖不兼容时整体失效。

## 2. Incremental scanner

- [x] 2.1 将候选路径 metadata discovery 与全文读取拆开；未变化且兼容的路径复用已脱敏 evidence，不重复全文读取。
- [x] 2.2 对新增、变化、metadata 不可用、删除和追问覆盖路径执行安全重读，并替换对应旧 evidence，保持 path policy、脱敏、预算和 AbortSignal 语义。

## 3. Analysis and map integration

- [x] 3.1 将 cache 生命周期接入首次分析与 `refineAndAnalyze`，确保首次分析无缓存时行为与 v1.1 一致。
- [x] 3.2 从当前有效 evidence 重建 atlas、结论和 evidence ids，避免陈旧路径继续贡献地图关系。
- [x] 3.3 在结构化结果和 Markdown 报告中输出有界的 reused、invalidated、reread、new、uncovered 摘要，不把复用误报为本轮读取。

## 4. Verification and documentation

- [x] 4.1 增加未变化追问、变化文件、scope 收窄/扩大、删除文件、缓存不兼容、预算耗尽、敏感内容和中断场景测试。
- [x] 4.2 运行 typecheck、lint、unit tests、OpenSpec strict validate，并核对首次全量分析与 v1.1 Harness 集成行为不回归。
- [x] 4.3 更新 v1 使用说明、安全边界和 roadmap，说明 session-only 缓存、metadata 新鲜度限制和无持久化边界。
