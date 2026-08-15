## Context

See `proposal.md` for the motivation. 当前关系推断集中在 `src/repository/analyze.ts` 的文本匹配；v1.2 已提供 metadata fingerprint、session-local 脱敏 evidence cache、scope 覆盖判定和部分结果语义，但缓存只知道文件证据，不知道证据是文本推测还是语法确认。

v1.3 必须继续使用现有 scanner 作为唯一全文读取入口，并把 AST 解析限制在当前 session 已经安全读取的脱敏文本上。解析结果进入现有 evidence、edge、atlas 和报告路径，不引入磁盘缓存、后台 watcher、运行时依赖解析或外部服务。

## Goals / Non-Goals

**Goals:**

- 使用现有 TypeScript 依赖的 compiler API 为 TypeScript/JavaScript 文件建立有界语法摘要。
- 输出带文件路径、行列位置、语法类别和最小脱敏摘要的 syntax-confirmed evidence。
- 确认相对 import/export 和声明边界，并与同一分析中的文本 inferred 关系安全去重。
- 让 AST 结果进入 v1.2 session cache，沿用 root、policy、fingerprint、scope、预算和 AbortSignal 失效语义。
- 在 AST 不可用、解析失败或预算不足时保留可用文本结果和明确的部分状态。

**Non-Goals:**

- 不支持所有语言；v1.3 首批只覆盖 TypeScript/JavaScript 常见源文件。
- 不执行 AST 中的代码，不加载模块，不解析真实运行时调用图，不访问 package registry 或网络。
- 不做完整类型检查、符号绑定、跨 workspace 项目引用、宏展开、控制流证明或自动修复。
- 不保存完整 AST、未脱敏源码或跨 session 索引。

## Decisions

1. **使用现有 TypeScript compiler API，解析脱敏文本。** 复用仓库已声明的 TypeScript 依赖，避免新增 parser 依赖和网络安装；compiler API 能同时覆盖 JS/TS 的 source locations 和 import/export 语法。备选的正则扩展无法提供语法确认，完整语言服务和类型检查则超出 v1.3 范围。若 parser 在运行环境不可用，系统按 not-analyzed 回退，不把文本结果伪装成 AST 结果。

2. **增加只读 `parse-ast` action 和 `syntax-confirmed` 状态。** AST 解析是本地只读分析动作，必须进入现有 action/audit/budget 体系；独立状态能让 report 和 atlas 区分 syntax-confirmed、inferred、read-failed 与 not-analyzed。此动作不改变写入、Shell、网络或受控 recipe 权限。

3. **保留最小 AST observation，不保留树。** 每个文件只提取 import/export、顶层函数/类/变量声明和有限的调用/边界线索，记录路径、行列、类别和脱敏标签；节点数量、文件数量和摘要长度都有上限。保留完整 AST 作为 session 数据会增加内存和敏感内容风险，故不采用。

4. **语法关系优先于文本关系，但不升级无 AST 证据的关系。** 先生成 AST-backed edges，再合并同路径的文本 edges；相同 `from/to/relation` 只保留一条，并以 syntax-confirmed evidence ids 和状态为准。仅有文本匹配的边继续为 inferred，避免缓存或命名相似造成错误升级。

5. **缓存沿用 v1.2 entry，AST evidence 按路径替换。** 同一 `EvidenceCacheEntry` 可同时保存全文/搜索 evidence 和 AST evidence；fingerprint 或 policy 不兼容时整体失效，scope 外的有效 AST evidence 继续作为 uncovered 上下文保留。变化或删除路径先移除旧 AST evidence，再从本轮安全解析结果重建。

6. **解析失败是文件级失败，不阻塞其他文件。** 单文件 parser diagnostic、unsupported extension、AST 上限和 AbortSignal 都转为文件级状态与有界 uncovered 摘要；已经确认的其他文件和已有文本推测继续进入 atlas。这样保留 v1/v1.2 的 partial-result contract。

## Risks / Trade-offs

- [脱敏文本可能改变字符串或语法] → 只把成功解析的结果标为 syntax-confirmed；解析失败保留 read-failed/not-analyzed，不回退成语法确认。
- [TypeScript compiler API 版本或运行时缺失] → 将 parser capability 作为可检测能力；缺失时安全降级为现有文本分析，并在报告中说明。
- [AST 观察增加 action 和内存消耗] → 设置文件、节点、摘要和 action 上限；复用 session cache 不重复读取或解析未变化文件。
- [文本边与 AST 边去重可能隐藏不同来源] → 保留合并后的全部 evidence ids，并以 syntax-confirmed 状态表达更强来源。
- [恶意源码触发极端语法树] → 只解析已脱敏、有界文本，在遍历节点时提前停止，不执行 visitor 外部副作用。

## Migration Plan

1. 先扩展类型、只读 action、AST evidence 结构和 OpenSpec fixtures，保持旧调用方的可选字段兼容。
2. 接入 TypeScript/JavaScript parser adapter、局部关系合并和 session cache replacement；没有 parser 或 parser 失败时保留 v1.2 文本路径。
3. 增加 parser success、mixed edge、unsupported/malformed、budget/signal/cache/sensitive 场景测试，再运行 v1.2 全量回归。
4. 文档说明 syntax-confirmed 的含义、支持范围和不等同于运行时/类型证明的限制。回滚时关闭 AST 分析路径即可，旧 evidence cache schema 不跨 v1.3 复用。
