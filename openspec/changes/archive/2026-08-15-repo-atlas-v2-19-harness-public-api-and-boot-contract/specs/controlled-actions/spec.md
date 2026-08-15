## MODIFIED Requirements

### Requirement: The system SHALL fail closed at the sandbox boundary

受控动作 MUST 通过 Harness 的 sandbox 能力包装精确 argv，并 MUST 通过 Harness 的 subprocess 能力管理进程树、超时和终止。RepoAtlas MUST 使用当前调用的 exact session 与已批准 recipe mode 调用官方 sandbox-policy resolver，并在执行前验证返回的 mode 与 absolute workspace root 完全匹配当前 session runtime。沙箱服务不可用、只提供部分但 recipe 要求完整约束、返回 root/mode 漂移、或包装失败时，系统 MUST 拒绝执行，绝不降级为未隔离运行。

#### Scenario: Sandbox is unavailable
- **WHEN** 当前 Harness session 没有可用的 sandbox provider
- **THEN** 系统 SHALL 返回可区分的沙箱不可用结果，且 SHALL 不启动原始 argv

#### Scenario: Resolved session policy drifts
- **WHEN** Harness sandbox policy 为当前 session 返回不同 mode、非 absolute root 或与 RepoAtlas session workspace 不同的 root
- **THEN** 系统 SHALL fail closed，且 SHALL 不调用 sandbox wrapper 或 subprocess

#### Scenario: Process exceeds the deadline
- **WHEN** 动作超过 recipe 的最大时长
- **THEN** 系统 SHALL 终止整个受管进程树，记录超时状态，并 SHALL 返回已截断且已脱敏的输出
