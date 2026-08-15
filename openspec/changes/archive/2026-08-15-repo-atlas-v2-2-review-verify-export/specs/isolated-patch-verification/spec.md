## Purpose

在已应用补丁的 session-owned detached worktree 中执行一次受 Harness 审批、沙箱和输出预算约束的只读验证，并把通过、失败、中止或不确定性与补丁应用状态分开记录。

## ADDED Requirements

### Requirement: The system SHALL verify only an applied patch in the owned worktree

verify MUST 要求已应用 patch、完全匹配的 patch confirmation digest、当前 session 自己创建的 worktree identity/base revision 和配置中的 recipe id。recipe MUST 为 enabled 且 sandboxMode=read-only；任意工作目录、命令、参数、remote 或 Shell MUST NOT 从 verify 请求中接受。

#### Scenario: A confirmed applied patch starts one controlled verification
- **WHEN** applied patch 的 exact digest 匹配、worktree identity/base revision 未变化、changed paths 仍在 patch targets 内，且 host Goal active+armed、Harness approval 返回 allowed-once
- **THEN** 系统 SHALL 在该 isolated worktree root 执行一次已配置 recipe，并返回 verification status=passed 或明确的 non-success status

#### Scenario: Missing capabilities fail closed before process start
- **WHEN** recipe 未配置、recipe 不是 read-only、Goal 未 active+armed、approval/subprocess/sandbox/sandboxPolicy 不可用，或 policy root 不匹配 worktree
- **THEN** 系统 SHALL 返回 blocked/denied/sandbox-unavailable，且 SHALL 不启动 subprocess

### Requirement: The system SHALL bound and redact verification results

验证结果 MUST 返回 verification id、recipe id、audit id、status、reason、退出状态或终止原因、bounded stdout/stderr、truncation/redaction metadata 和 worktree identity。系统 MUST 不保存未脱敏 secret-like 输出，并 MUST 保留 patch-applied 与 commit-not-created/push-not-performed 状态。

#### Scenario: A successful verification is auditable without overstating landing
- **WHEN** configured recipe 在 isolated worktree 中以 exit code 0 完成且前后 worktree identity、base revision、changed paths 检查通过
- **THEN** verification status MUST 为 passed，同时 patch MUST 仍为 applied，commit MUST 为 not-created，push MUST 为 not-performed

#### Scenario: Verification failure is not patch failure
- **WHEN** recipe 返回非零、超时、被中止、输出超预算、执行失败或 postcondition 无法确认
- **THEN** verification MUST 为 failed、interrupted 或 blocked，系统 MUST 不返回 verification=passed，且 MUST 不把已应用 patch 改报为 patch-not-applied

### Requirement: The system SHALL make verification non-replayable within the patch record

同一 patch 的 verification terminal result 在当前 session 中 MUST 可审计地重放返回，不能因为重复 verify 自动再次启动 recipe；新的验证运行需要新的 patch draft 和新的 exact confirmation 生命周期。验证不得自动修复、回滚、清理或释放 dirty worktree。

#### Scenario: Replaying a terminal verification does not spawn again
- **WHEN** 调用方使用同一 patch id、digest 和 recipe 再次 verify，且该 patch 已有 terminal verification result
- **THEN** 系统 SHALL 返回既有结果，且 subprocess 调用次数 MUST 不增加

#### Scenario: Verification keeps uncertain worktrees for review
- **WHEN** verification 后 worktree 变 dirty、identity 变化、出现未声明路径或 inspection 失败
- **THEN** 系统 SHALL 保留 worktree 并返回 blocked/unknown-style verification result，且 MUST 不 force rollback、git clean 或 release
