import { randomUUID } from 'node:crypto'
import type { ChangeProposalCommitAuthorizer } from '../repository/change-proposal.ts'
import type { HarnessAgent, HarnessPluginContext } from './public.ts'

type ApprovalOutcome = 'allowed-once' | 'rejected' | 'cancelled' | 'unavailable'

interface HarnessApprovalService {
  request(request: {
    agent: HarnessAgent
    toolName: string
    callId?: string
    reason?: string
    signal?: AbortSignal
  }): Promise<ApprovalOutcome>
}

interface HarnessGoalService {
  get(agent: HarnessAgent): { phase: 'active' | 'paused' | 'blocked' | 'complete'; activation: 'armed' | 'disarmed' } | undefined
}

export function createChangeProposalCommitAuthorizer(ctx: HarnessPluginContext): ChangeProposalCommitAuthorizer {
  return {
    async authorize(request) {
      const execution = request.execution
      if (!hasConfirmedGoal(ctx.get?.<HarnessGoalService>('goals'), execution?.agent)) {
        return { allowed: false, reason: 'host-attested active and armed Goal is required before commit approval' }
      }
      const approval = ctx.get?.<HarnessApprovalService>('approval')
      if (!approval) return { allowed: false, reason: 'Harness approval capability is unavailable' }
      if (!execution?.agent || !execution.callId) return { allowed: false, reason: 'a live Harness agent and tool call id are required for commit approval' }
      try {
        const outcome = await approval.request({
          agent: execution.agent,
          toolName: 'repo_atlas_change_proposal',
          callId: execution.callId,
          reason: `Approve one RepoAtlas local isolated commit: ${request.commitMessage}`,
          signal: request.signal,
        })
        return outcome === 'allowed-once'
          ? { allowed: true, auditId: `commit-approval-${randomUUID()}`, reason: 'Harness approval granted for one isolated local commit' }
          : { allowed: false, reason: `Harness approval outcome: ${outcome}` }
      } catch {
        return { allowed: false, reason: 'Harness commit approval request failed closed' }
      }
    },
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
