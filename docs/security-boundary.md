# RepoAtlas v1 安全边界

## 默认策略

RepoAtlas v1.3 的默认权限是只读。Policy Gate 只允许列举、读取、搜索、常见配置摘要和受边界约束的 `parse-ast`；以下能力默认拒绝：写入、删除、重命名、任意 Shell、网络访问、依赖安装、Git 推送和第三方服务调用。

报告导出是显式确认后的受控例外：用户必须确认，目标路径必须仍在 workspace 内，且只创建报告三件套。没有确认时不会写文件。

## v1.1 受控动作

受控动作仍默认关闭。启用后，工具只能选择配置中的固定 recipe id 和 workspace 内 cwd；不接受自由 Shell、解释器参数或新的可执行文件。

执行前必须同时满足：Harness 当前 agent 存在 active+armed Goal、Harness `approval.request()` 返回一次性 `allowed-once`，以及完整 sandbox/subprocess/sandboxPolicy 能力可用。无效 recipe、越界路径、缺少 Goal 或审批能力时，不会发起审批或启动子进程。

审批由 Harness 写入 `approval/asked`/`approval/decided`，工具调用结果由 Harness 写入 `tool/call`/`tool/result`；RepoAtlas 返回关联 audit id、退出状态、受限输出和脱敏状态。沙箱不可用或 enforcement 为 partial 时故障关闭。

## v2.2 patch review、export 与 verification

v2.2 的 `repo_atlas_change_proposal` 增加 `review-patch`、`export-patch` 和 `verify-patch`。review 只返回当前 session 的 bounded patch descriptor；export 必须提供完全匹配的 patch digest，只把 canonical patch text 作为当前 tool result 返回，不创建 workspace 文件、缓存、数据库记录或远程上传。

verification 只能指向已应用、仍由当前 session 拥有且 identity/base revision 未变化的 detached worktree。recipe 必须是显式配置、enabled 且 `read-only`；执行仍需要 Harness active+armed Goal、一次性 `allowed-once` approval、完整 `sandboxPolicy`、`sandbox` 和 `subprocess` 能力。模型不能提供执行 root、任意命令、参数或 Shell；root 由 proposal manager 传入并必须与 Harness resolved policy 完全匹配。

verification stdout/stderr 继续受 recipe 输出预算限制并执行 Secret-like 脱敏。verification status 与 `patch-applied`、`commit-not-created`、`push-not-performed` 分离；失败、中止、超时、sandbox 不可用或 postcondition 不确定时，不把 patch 报告为未应用，不执行逆补丁、`git clean`、force rollback 或 release。

## v2.3 isolated worktree commit

v2.3 只允许对当前 session 中已应用且 verification=passed 的 patch 准备 commit draft。commit message 必须由调用方显式提供、非空、bounded 且不含 Secret-like 内容；prepare 只写 session memory，不触碰 Git index、worktree、source workspace 或 remote。

confirm 必须提供完全匹配的 commit digest，并通过 Harness active+armed Goal 与一次性 `allowed-once` approval。实时检查必须确认 worktree identity、原始 base revision 和 changed path set 仍匹配 patch targets；任何额外或缺失路径都会 fail closed。

Git adapter 只执行固定的本地 path-limited staging 和 commit：`shell:false`、`--no-verify`、`--no-gpg-sign`，不接受 remote、push、merge、branch、amend、author、hook 或任意 Shell 输入。source workspace 永远不参与 commit。

成功 commit 后必须证明 returned HEAD revision、stable worktree identity 和 clean worktree；否则返回 `commit-creation-unknown`，保留 worktree，不执行 reset、unstage、`git clean`、逆补丁或 force remove。成功结果仍明确标记 `push-not-performed`，既有 safe release 只允许释放干净且 identity 匹配的 session-owned worktree。

## v2.4 source workspace landing

v2.4 将 source landing 与 isolated commit 分成独立 draft。只有当前 session 中 `commit-created` 且 revision 已知的 detached-worktree commit 才能 prepare landing；source workspace 必须 clean、repository root 匹配，且 HEAD 仍等于 proposal 的 base revision。prepare 不修改 source、index、isolated worktree 或 remote。

confirm 必须提供 landing exact digest，并通过 Harness active+armed Goal 和一次性 `allowed-once` approval。工具不接受 source path、commit revision、merge strategy 或命令输入；这些值只从当前 session proposal/commit 记录派生。

adapter 只执行固定本地 `git merge --ff-only --no-verify --no-edit <recorded commit revision>`，不解决冲突、不创建 merge commit、不创建 branch、不访问 remote、不 push。source revision drift、dirty/staged/untracked changes 或 non-fast-forward 都 fail closed。

成功 landing 必须证明 source HEAD 等于 target commit revision、source clean 且 repository/path 未变化。中止、超时、Git 结果或 postcondition 不确定时返回 `landing-creation-unknown`，保留 source/worktree，不执行 reset、revert、clean、逆补丁或 force remove；成功后仍标记 `push-not-performed`。

## v2.5 session-only lifecycle inspection

v2.5 的 `repo_atlas_change_proposal` 增加 `inspect`。它只按当前 session memory 中已知的 `proposalId` 返回已有 bounded、redacted 生命周期快照，包含 proposal、patch、verification、commit、landing 和 `patch-not-applied`、`commit-not-created`、`push-not-performed` 等非执行状态；不创建第二套历史或持久化 registry。

inspect 不刷新 source workspace、isolated worktree、Git、Harness Goal/approval、sandbox 或 subprocess，也不重新计算 digest、触发审批或推进任何状态。unknown、空值或其他 session 的 proposal id fail closed，返回 blocked 且不返回 registry、worktree 或 Git 信息。返回对象是 detached snapshot，调用方修改结果不会改变 manager 内部状态；canonical patch text 仍只能通过显式 `export-patch` 返回。

## v2.6 bounded proposal listing

v2.6 的 `repo_atlas_change_proposal` 增加 `list`。它只从当前 session registry 返回最多 100 条、默认 50 条的 newest-first proposal summary，并报告 total/returned/truncated。summary 只包含 bounded intent、proposal id、时间、target counts、lifecycle/execution/nested operation statuses 和 outcome flags，不包含 workspace/repository/worktree path、evidence ids、digest、canonical patch text 或 commit message。

limit 缺失使用默认值；0、负数、小数、非数值、非 safe integer 或超过 100 时 fail closed，返回空列表且不暴露 registry 数量。list 不刷新 source workspace、isolated worktree 或 Git，不请求 Harness approval/Goal，不调用 sandbox/subprocess，不改变 lifecycle，不跨 session 或持久化；已记录的 rejected、blocked、interrupted、released 和 `*-creation-unknown` 状态原样保留。

## v2.7 read-only live-state inspection

v2.7 的 `repo_atlas_change_proposal` 增加 `inspect-live`。它只从当前 proposal 派生 source workspace 与 session-owned worktree 的固定本地 read-only inspection，返回 source/worktree 的 clean、revision/base match、repository/path/identity match 和 changed path count；live observation 不返回 absolute paths 或 changed path names。

source 与 worktree 检查分别标记 available、unknown 或 not-applicable，overall 状态区分 available、partial、unknown 和 not-applicable。检查失败、AbortSignal 或 uncertain postcondition 只影响 live observation，不改变 proposal、patch、verification、commit、landing 或 release 状态；不会把 `creation-unknown` 升级为 created/landed 或未执行。inspect-live 不请求 approval/Goal，不调用 sandbox/subprocess，不执行 mutation Git、网络、cleanup、持久化或跨 session 操作。

## v2.8 session-only lifecycle event history

v2.8 的 `repo_atlas_change_proposal` 增加 `history`。manager 为当前 session 的每个 proposal 在内存中保留 bounded event timeline，只在 proposal/worktree、patch、verification、commit、landing 或 release 实际状态变更后追加事件；inspect、list、inspect-live、review/export、digest mismatch 和保持 pending 的 approval denial 不追加事件。

事件只包含 phase、proposal/operation/execution 状态快照、bounded/redacted reason、event id、时间和 `sessionOnly=true`。不包含 workspace/repository/worktree path、changed path names、evidence、digest、patch text 或 commit message。history 支持 1 到 100 的 safe-integer limit，按 chronological order 返回最近 retained events，并报告 total/returned/truncated；proposal retention 超限时只淘汰最旧事件。

history 只读取 manager memory，不刷新 source/worktree/Git，不请求 approval/Goal，不调用 sandbox/subprocess，不联网，不写 workspace、磁盘、数据库或远程服务；unknown proposal 和非法 limit fail closed。blocked、interrupted、`patch-application-unknown`、`commit-creation-unknown`、`landing-creation-unknown`、`patch-not-applied`、`commit-not-created` 与 `push-not-performed` 等既有语义原样保留。

## v2.9 read-only recovery guidance

v2.9 的 `repo_atlas_change_proposal` 增加 `inspect-recovery`。它只读取当前 session registry，将 pending、confirmed、patch、verification、commit、landing 和 release 状态映射为现有 lifecycle action 的 bounded recommendation/allowedActions；结果包含 proposal summary、reason、`manualReviewRequired` 和 `sessionOnly=true`。guidance 是决策提示，不是授权、审批、执行结果或成功保证。

`patch-application-unknown`、`commit-creation-unknown`、`landing-creation-unknown`、blocked/interrupted 或无法证明安全继续的 nested 状态，统一返回 `manual-review-required` 和空 allowedActions；rejected/released 等明确终态返回 `no-action`。系统不推荐 uncertain 状态 release，不执行 rollback、reset、revert、merge、冲突解决、cleanup 或其他 recovery。

inspect-recovery 不访问 source/worktree/Git/history、approval、Goal、sandbox、subprocess、network 或 filesystem，不改变 proposal/lifecycle/event history，不持久化、不跨 session，不返回 path、digest、patch text、commit message、evidence、command 或 approval 数据。unknown/空 proposal id fail closed，结果为 detached snapshot。

## v2.10 read-only landing preflight

v2.10 的 `inspect-landing` 只接受当前 session 中已创建且 revision 已知的 local commit proposal id；source workspace、recorded base revision、session-owned worktree identity 和 target revision 全部由 proposal registry 派生，工具输入不能覆盖路径、revision、merge strategy 或命令。没有 created commit 的 proposal 返回 `not-applicable`，不会创建 worktree 或尝试 landing。

adapter 只执行固定、shell=false 的本地 Git inspection：source repository/path、HEAD、clean 状态、target commit 解析，以及双向 `merge-base --is-ancestor`。结果区分 `fast-forwardable`、`already-landed`、`source-ahead`、`diverged`、`source-dirty`、`source-revision-drift`、`target-unavailable` 和 `unknown`；dirty、identity mismatch、revision drift、target/ancestry failure 或 abort 不会返回 landing-ready 成功结论。preflight 是观察，不是授权、approval、landing 完成或冲突解决建议。

inspect-landing 不调用 `commit`、`land`、`remove`、patch、approval、Goal、sandbox 或 subprocess mutation，不写 source/index/worktree/磁盘，不联网、不持久化、不追加 lifecycle event。结果是 bounded、detached、session-only observation，assessment 不返回 absolute path、patch text、digest、command 或 approval data；后续实际 landing 必须重新执行既有 digest、Goal、approval、clean source 和 exact-base 检查。

## v2.11 read-only release readiness

v2.11 的 `inspect-release` 只接受当前 session 中的 `proposalId`，并从 registry 派生 proposal state、session-owned worktree 和 recorded identity。没有 managed worktree 时返回 `not-applicable`；保留 worktree 但 proposal 不是 `confirmed` 时返回 `proposal-state-blocked`。confirmed proposal 才会进行现有固定 worktree inspection，并区分 `ready`、`worktree-dirty`、`identity-mismatch` 和 `unknown`。

`ready` 只表示 inspection 当时观察到 clean 且 identity 匹配，不是 release authorization、approval 或 cleanup 完成。dirty、identity mismatch、inspection failure 和 abort 都 fail closed；现有 `release` action 仍必须在真正 remove 前重新检查事实。inspect-release 只调用 read-only `inspect`，不调用 `remove`、`land`、`commit`、patch，不请求 Harness approval、Goal、sandbox 或 subprocess capability，也不执行任意命令；不追加 lifecycle event，不写 workspace/index/worktree/磁盘，不联网、不持久化。assessment 是 bounded、detached、session-only，不返回 absolute path、changed path name、patch text、digest、command 或 approval data。

## v2.12 public-release baseline

v2.12 的开源化工作只建立仓库交付边界：根目录许可证、贡献/行为/安全/变更文档、源码优先的 Harness bundle 安装说明和 CI 质量门禁。它不改变 RepoAtlas 运行时权限，不新增网络、Shell、持久化、跨 session、source workspace 写入或 remote Git 能力；CI 中下载 OpenSpec CLI 只发生在 disposable runner，不代表插件运行时获得网络访问。

在 distribution decision 完成前，`package.json` 保持 `private: true`，仓库不宣称 npm 包、`dist/` 编译产物、真实 Harness CI 集成、tag/release 或 support SLA。许可证持有人确认、clean-clone/packed-install、真实 Harness smoke test 和首个公开 release 都是后续独立审阅项。

## 路径与文件

- workspace 根目录先规范化；包含 `..` 的请求直接拒绝。
- 解析后的路径必须位于 workspace 内；外部符号链接拒绝，内部符号链接默认跳过。
- 默认排除 `.git`、`node_modules`、`dist`、`build`、`coverage`、缓存和虚拟环境目录。
- `.env`、私钥、`*.pem`、`*.key`、凭证文件和常见 secret 文件不读取。
- 已读取文本仍会对密钥、JWT、私钥块、password/token/api_key 等 Secret-like 值脱敏。

## 不可信仓库内容

README、注释、脚本、配置和生成文件均是被分析的数据，不是系统指令。它们不能授予新的工具权限，不能要求模型忽略策略，也不能触发上传或命令执行。

## 资源与可审计性

默认预算为：最多 5000 个候选文件、单文件 1 MiB、总文本 20 MiB、60 个 ReAct 动作；AST 另有最多 64 个文件、每文件 12,000 tokens、100 条观察和 240 字符摘要上限。拒绝、跳过、预算耗尽和失败会写入当前 session 的审计/限制信息；不会上传到远程服务。

v1.2 evidence cache 只保存当前 session 内已经过路径策略、文本读取和 Secret-like 脱敏的有界 evidence，以及 size/mtimeMs/ctimeMs fingerprint。缓存不保存未脱敏原文，不写入 workspace 或其他持久化介质，不跨 session，不执行 Shell，不访问网络，也不上传代码。

metadata fingerprint 只能提供有限的新鲜度保证；metadata 不可用、workspace root、安全策略或 cache schema 不兼容时按失效处理，读取仍必须经过原有 path policy、预算、脱敏和 AbortSignal 边界。

AST 只处理已确认 scope 内的 `.ts`、`.tsx`、`.js`、`.jsx` 脱敏文本。它输出带位置的最小语法观察，不执行源码、不加载模块、不建立运行时调用图；文本推测不得因命名相同或 cache 命中升级为“语法确认”。AST evidence 与其他 evidence 一样只存在当前 session 内，不写入 workspace、磁盘、数据库或远程服务。

## 回滚

RepoAtlas 是无迁移的插件。停用 Harness profile 或移除本项目目录即可回滚，不需要恢复数据库或远程配置。v2.11 readiness、v2.10 preflight、v2.9 guidance、v2.8 event history、v2.7 live observation、v2.6 summary listing 与 v2.5 inspection 不新增持久状态；proposal/event 与既有 patch/export/verification/commit/landing registry 随进程结束丢弃。source landing 只执行显式确认的 local fast-forward，remote 不会被工具访问或更新。孤儿 worktree、landing uncertainty、manual-review 状态或被淘汰的历史事件仍按人工检查和恢复路径处理，工具不会跨 session 自动接管、reset、删除、回滚或重建历史。
