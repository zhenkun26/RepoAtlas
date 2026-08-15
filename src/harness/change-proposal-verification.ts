import { randomUUID } from 'node:crypto'
import { runControlledAction, type ControlledActionRuntime, type ControlledActionResult, type ControlledActionSubprocess, type ControlledActionSandbox, type ControlledActionPolicyResolver } from '../actions/runtime.ts'
import type { RepoAtlasConfig } from '../types.ts'
import type { ChangeProposalVerification, ChangeProposalVerificationStatus } from '../types.ts'
import type { ChangeProposalVerificationExecution, ChangeProposalVerificationRunner } from '../repository/change-proposal.ts'
import type { HarnessAgent, HarnessApprovalService, HarnessGoalService, HarnessPluginContext, HarnessSandboxPolicyService } from './public.ts'

export function createChangeProposalVerificationRunner(config: RepoAtlasConfig, ctx: HarnessPluginContext): ChangeProposalVerificationRunner {
  return {
    async run(request) {
      const execution = request.execution
      const recipe = config.controlledActions.recipes.find((candidate) => candidate.id === request.recipeId && candidate.enabled)
      if (!recipe) return verificationFromResult(request.recipeId, request.worktree.identity, deniedVerification(request.recipeId, 'verification recipe is not configured and enabled'))
      if (recipe.sandboxMode !== 'read-only') return verificationFromResult(request.recipeId, request.worktree.identity, deniedVerification(request.recipeId, 'patch verification requires a read-only recipe'))
      const goalConfirmed = hasConfirmedGoal(ctx.get?.<HarnessGoalService>('goals'), execution?.agent)
      if (!goalConfirmed) return verificationFromResult(request.recipeId, request.worktree.identity, deniedVerification(request.recipeId, 'host-attested active and armed Goal is required before verification'))
      const approval = await requestApproval(ctx.get?.<HarnessApprovalService>('approval'), execution, request.recipeId, request.worktree.path, request.signal)
      const result = await runControlledAction(config, {
        recipeId: request.recipeId,
        cwd: '.',
        workspaceRoot: request.worktree.path,
        session: execution?.agent?.session,
        goalConfirmed,
        userConfirmed: approval.allowed,
        confirmationReason: approval.reason,
        signal: request.signal,
      }, createControlledActionRuntime(ctx, execution))
      return verificationFromResult(request.recipeId, request.worktree.identity, result)
    },
  }
}

function verificationFromResult(recipeId: string, worktreeIdentity: string, result: ControlledActionResult): ChangeProposalVerification {
  return {
    verificationId: `verification-${randomUUID()}`,
    auditId: result.auditId,
    recipeId,
    status: verificationStatus(result.status),
    reason: result.reason,
    worktreeIdentity,
    stdout: result.stdout,
    stderr: result.stderr,
    outputTruncated: result.outputTruncated,
    redacted: result.redacted,
    redactedMatchCount: result.redactedMatchCount,
    exitCode: result.exitCode,
    signal: result.signal,
    createdAt: new Date().toISOString(),
  }
}

function verificationStatus(status: ControlledActionResult['status']): Exclude<ChangeProposalVerificationStatus, 'not-run'> {
  if (status === 'success') return 'passed'
  if (status === 'failed') return 'failed'
  if (status === 'timed-out') return 'timed-out'
  if (status === 'cancelled') return 'cancelled'
  if (status === 'sandbox-unavailable') return 'sandbox-unavailable'
  return 'denied'
}

function deniedVerification(recipeId: string, reason: string): ControlledActionResult {
  return {
    status: 'denied',
    auditId: `verification-${randomUUID()}`,
    recipeId,
    reason,
    stdout: '',
    stderr: '',
    outputTruncated: false,
    redacted: false,
    redactedMatchCount: 0,
  }
}

function hasConfirmedGoal(goals: HarnessGoalService | undefined, agent: HarnessAgent | undefined): boolean {
  if (!goals || !agent) return false
  try {
    const goal = goals.get(agent)
    return goal?.phase === 'active' && goal.activation === 'armed'
  } catch {
    return false
  }
}

async function requestApproval(
  approval: HarnessApprovalService | undefined,
  execution: ChangeProposalVerificationExecution | undefined,
  recipeId: string,
  worktreePath: string,
  signal?: AbortSignal,
): Promise<{ allowed: boolean; reason: string }> {
  if (!approval) return { allowed: false, reason: 'Harness approval capability is unavailable' }
  if (!execution?.agent || !execution.callId) return { allowed: false, reason: 'a live Harness agent and tool call id are required for verification approval' }
  try {
    const outcome = await approval.request({
      agent: execution.agent,
      toolName: 'repo_atlas_change_proposal',
      callId: execution.callId,
      reason: `Approve one RepoAtlas read-only patch verification: ${recipeId} at isolated worktree ${worktreePath}`,
      signal,
    })
    return outcome === 'allowed-once'
      ? { allowed: true, reason: 'Harness approval granted for one patch verification' }
      : { allowed: false, reason: `Harness approval outcome: ${outcome}` }
  } catch {
    return { allowed: false, reason: 'Harness verification approval request failed closed' }
  }
}

function createControlledActionRuntime(ctx: HarnessPluginContext, execution: ChangeProposalVerificationExecution | undefined): ControlledActionRuntime {
  const sandboxPolicy = ctx.get?.<HarnessSandboxPolicyService>('sandboxPolicy')
  const policy: ControlledActionPolicyResolver | undefined = sandboxPolicy === undefined ? undefined : {
    resolve(request) {
      const resolved = sandboxPolicy.resolve({ mode: request.mode, session: execution?.agent?.session })
      if (resolved.mode !== 'read-only' && resolved.mode !== 'workspace-write') throw new Error('unsupported sandbox mode returned by Harness')
      return { mode: resolved.mode, workspaceRoot: resolved.workspaceRoot, sessionId: resolved.sessionId }
    },
  }
  return {
    subprocess: ctx.get?.<ControlledActionSubprocess>('subprocess'),
    sandbox: ctx.get?.<ControlledActionSandbox>('sandbox'),
    sandboxPolicy: policy,
  }
}
