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
13. v2.9（已完成）：提供 session-only `inspect-recovery` guidance，将 proposal registry 状态映射为 bounded 的下一步建议和 manual-review-required/no-action 结论；不执行 recovery、不刷新 Git、不授权、不持久化。rollback、reset、revert、merge、冲突解决、force cleanup 和团队协作索引仍不属于本版本。
14. v2.10（已完成）：提供 session-only `inspect-landing` preflight，使用固定本地 Git read-only inspection 区分 fast-forwardable、already-landed、source-ahead、diverged、dirty、revision drift、target unavailable 和 unknown；不执行 landing、merge、冲突解决、rollback、cleanup、remote 或 push，也不把观察结果视为授权或已完成。
15. v2.11（已完成）：提供 session-only `inspect-release` readiness observation，使用现有 worktree read-only inspection 区分 not-applicable、ready、proposal-state-blocked、worktree-dirty、identity-mismatch 和 unknown；不执行 release、remove、cleanup、approval、Git mutation 或持久化，也不把 ready 观察结果视为 release 已完成或授权。
16. v2.12（已完成，开源化基线）：增加 MIT 工作许可证、贡献/行为/安全/变更文档、源码优先分发说明、release checklist 和 Node.js 22/24 GitHub Actions 门禁；保持 `private: true`，不发布 npm、不生成编译产物、不创建 tag/release，不改变任何 session-only runtime boundary。
17. v2.13（已完成）：确定继续 source/plugin bundle first；增加 clean-checkout + local packed-install evaluation，明确 tarball 不等于 npm consumer import；固定公开 DeepSeek Harness revision `47f943859bef60e4160492346772ded9b24f765a`、Node 24.x 和 pnpm 11.7.0，提供 shell-free compatibility runner 与仅 `workflow_dispatch` 的真实 Harness smoke workflow；该 public pin smoke 已实际通过。外部 clone/install 仍不进入 runtime 或默认 CI。
18. v2.14（已完成，需独立 release 授权）：增加 proposed support policy、source-first 首次 release procedure、read-only `verify:release-preflight` 和 manual release-preflight workflow；preflight 只观察候选状态，不创建 tag、GitHub Release、npm publication、push 或 deployment。版权持有人确认、release notes 和实际 release 仍是人工 gate。
19. v2.15（已完成）：优化开源项目展示，补充安全优先、证据驱动和 source-first 的项目描述、README landing 内容与 package description；不改变 runtime、npm 或 release side effect 边界。
20. v2.16（已完成）：将 README 的主要评估、安装、安全、兼容性、分发和治理路径改为中英双语；共享命令、路径、链接和 revision，避免技术事实漂移。
21. v2.17（已实现，需 clean candidate preflight 与独立 release 授权）：对齐下一次 source-first candidate `0.1.1`、不可变 `v0.1.0` 历史 tag、双语 release status、CHANGELOG、release checklist 和手动 GitHub About metadata handoff；不移动 tag、不创建 GitHub Release、不发布 npm、不访问网络。

每个版本都应先更新安全边界、预算、部分失败语义和验收 fixture，再扩展工具权限。v2.11 的 OpenSpec sync/archive/commit/push、v2.12 的 release baseline、v2.17 的 candidate alignment 与实际 tag/Release 操作仍是独立的审阅边界。
