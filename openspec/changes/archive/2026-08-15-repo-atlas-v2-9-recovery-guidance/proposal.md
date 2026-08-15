# v2.9 Read-only recovery guidance

## Why

v2.8 已提供 lifecycle event history，但调用方仍需要从当前 session registry 判断“下一步是否可以继续、应当拒绝、应当释放，还是必须人工复核”。直接增加 rollback、reset、revert、merge 或 cleanup 会越过现有安全边界，因此先提供一个不执行任何动作的 recovery decision surface。

## What changes

- 在 `ChangeProposalManager` 增加 session-only、read-only recovery guidance 查询。
- 在 `repo_atlas_change_proposal` 增加 `inspect-recovery` action。
- 根据 proposal/patch/verification/commit/landing registry 状态返回 bounded summary、推荐 action、有限安全 action 和 manual-review 标志。
- 对 `*-creation-unknown`、patch application unknown、blocked/interrupted 等状态 fail safe，只返回人工复核，不推荐 release 或任何执行 action。
- 更新 OpenSpec、roadmap、安全边界、Harness 文档和状态机测试。

## Scope boundary

- 只读取当前 manager memory；不调用 Git adapter、live inspection、approval、Goal、sandbox、subprocess、network 或 filesystem。
- 不改变 proposal、patch、verification、commit、landing、release 状态，不追加 lifecycle event，不创建 recovery record。
- 不实现 rollback、reset、revert、merge、冲突解决、force cleanup、patch generation/application、commit、push、部署或依赖安装。
- 未知/空 proposal id fail closed；输出不包含路径、digest、patch text、commit message、evidence ids 或命令。
