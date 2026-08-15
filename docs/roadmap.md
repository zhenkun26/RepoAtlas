# 限制与后续路线

## 不属于 v1

- 受控命令执行、测试/构建运行和自动修复。
- 网络抓取、远程仓库访问和第三方服务连接。
- 自动写回用户代码库、提交或推送 Git。
- 完整语言 AST、运行时调用图和跨仓库依赖图。
- 常驻数据库、跨 session 增量索引和团队协作权限模型。

## 后续版本建议

1. v1.1（已完成）：在明确授权和沙箱中增加受控 recipe 执行，并把命令、参数、输出和审批结果纳入 Harness 审计链；标准 sandbox Web 成功路径与 no-sandbox fail-closed 路径均已验收。
2. v1.2（已完成 OpenSpec 边界）：加入仅限 session 的增量地图与 evidence cache，只重新读取新增、变化、metadata 不可用或被追问覆盖的范围；缓存不持久化、不跨 session、不联网，metadata 新鲜度限制已记录。
3. v1.3（已完成）：按语言接入受安全边界和预算约束的 TypeScript/JavaScript 语法确认，区分“文本推测”和“语法确认”的关系；AST evidence 仅限当前 session，并与 metadata cache 共同失效。
4. v2（已完成）：在独立工作树中提供用户确认后的代码变更提案，仍然默认不提交、不推送；提案状态、worktree 生命周期和证据引用限制在当前 session，不自动生成或应用补丁。
5. v2.1（已完成并归档）：接收用户或宿主显式提供的有界 unified diff，在 confirmed proposal 的隔离 worktree 中经过二次 digest 确认后应用；继续禁止 source workspace 写入、自动回滚、commit、push、部署、依赖安装和网络访问。
6. v2.2（已完成）：对已准备或已应用的 patch 提供 session-only review/export；在 Harness Goal、一次性 approval、read-only recipe、sandbox 和 subprocess 约束下，对隔离 worktree 执行一次受控验证并记录 bounded、redacted result。继续禁止 patch 生成、source workspace 写入、commit、merge、push、部署、依赖安装、网络和自动清理。
7. v2.3（已完成）：对已应用且 verification=passed 的 patch 提供 session-only isolated-worktree commit draft；commit 必须经过 exact digest、active+armed Goal 和一次性 Harness approval，只能对声明路径执行固定本地 Git staging/commit，并在 postcondition 不确定时保留 worktree。继续禁止 source workspace 写入、merge、push、远程访问、hooks、GPG signing、author override、部署、依赖安装和自动清理。
8. v2.4（已完成）：对 v2.3 已创建的 session-owned commit 提供独立 source landing draft；只允许 source workspace clean、HEAD exact base revision 下的固定 `merge --ff-only` fast-forward，并要求二次 digest、active+armed Goal 和一次性 Harness approval。继续禁止冲突解决、merge commit、branch 操作、remote、push、回滚和自动清理。
9. v2.5（已完成）：提供按 proposal id 的 session-only lifecycle inspection，返回 bounded、redacted 的 proposal/patch/verification/commit/landing 快照和非执行状态；不刷新 Git、不读取 workspace、不请求审批、不改变 lifecycle。
10. v2.6（已完成）：提供固定上限、newest-first 的 session-only proposal summary listing，支持发现 proposal id 后继续 inspect；不返回路径、evidence、digest、patch text、commit message 或 worktree，不刷新 Git，不跨 session。
11. v2.7（已完成）：提供 source workspace 与 session-owned worktree 的只读 live-state inspection，区分 available/partial/unknown/not-applicable，并保留 creation-unknown 与其他 lifecycle 状态；不写 Git、不修复、不改变 registry、不持久化。
12. v2.8（已完成）：提供 bounded、脱敏、session-only 的 proposal lifecycle event history，记录实际状态转移及 blocked/interrupted/uncertain 结果；history 只读、不刷新 Git、不持久化、不跨 session。
13. v2.9（当前实现）：提供 session-only `inspect-recovery` guidance，将 proposal registry 状态映射为 bounded 的下一步建议和 manual-review-required/no-action 结论；不执行 recovery、不刷新 Git、不授权、不持久化。rollback、reset、revert、merge、冲突解决、force cleanup 和团队协作索引仍不属于本版本。

每个版本都应先更新安全边界、预算、部分失败语义和验收 fixture，再扩展工具权限。
