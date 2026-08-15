## Why

当前每次分析或同一 session 的追问都会重新读取和解析大量未变化文件，既浪费扫描预算，也让后续地图更新难以说明哪些证据来自本轮、哪些来自之前的确认结果。v1.1 已完成受控动作与 Harness 审计边界，现在需要在不扩大权限和不牺牲证据新鲜度的前提下复用已有 session 证据。

## What Changes

- 增加仅限同一 session、同一 workspace 的增量证据缓存。
- 为已读取文件记录有界 metadata fingerprint；fingerprint 未变化时复用已脱敏证据，变化或 metadata 不可用时重新读取。
- 追问或 scope 收窄时只重新分析被覆盖、失效或新增的范围，并用当前有效证据重建 atlas 地图。
- 在分析结果中提供复用、失效、重新读取和未覆盖范围摘要，避免把缓存命中误报为本轮新读取。
- workspace、scope、安全配置或缓存版本变化时按规则失效缓存；不新增跨 session、磁盘或远程持久化。

## Capabilities

### New Capabilities

- `incremental-evidence-cache`: 在安全预算和明确失效边界内复用 session 证据，并生成可审计的增量地图更新摘要。

### Modified Capabilities

<!-- No existing requirement is replaced; the new capability owns the additive cache contract. -->

## Impact

- 影响 `src/types.ts`、`src/repository/scanner.ts`、`src/repository/analyze.ts`、`src/session.ts` 和报告生成路径，增加缓存元数据、增量分析结果和测试 fixture。
- 不新增依赖，不改变 Harness 权限模型，不写入用户 workspace，不访问网络，也不建立跨 session 的持久化存储。
- 现有首次全量分析、只读安全策略、预算与部分失败语义必须保持兼容。
