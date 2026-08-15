import type { ChangeProposalOperation, ChangeProposalRequest } from '../types.ts'
import { ChangeProposalManager } from '../repository/change-proposal.ts'
import type { HarnessTool, HarnessToolExecution } from './public.ts'

export function createChangeProposalTool(manager: ChangeProposalManager): HarnessTool {
  return {
    name: 'repo_atlas_change_proposal',
    description: '准备、确认、拒绝或释放当前 session 的隔离代码变更提案；不会生成补丁、提交或推送。',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['prepare', 'confirm', 'reject', 'release'] },
        sessionId: { type: 'string' },
        intent: { type: 'string' },
        targets: { type: 'array' },
        evidenceIds: { type: 'array' },
        proposalId: { type: 'string' },
        confirmationDigest: { type: 'string' },
      },
      additionalProperties: false,
    },
    output: {
      schema: { type: 'object' },
      render: (_args: unknown, value: unknown): Array<{ type: 'text'; text: string }> => [{
        type: 'text',
        text: JSON.stringify(value, null, 2),
      }],
    },
    async execute(input: unknown, execution?: HarnessToolExecution) {
      const request = proposalInput(input)
      const signal = execution?.signal ?? new AbortController().signal
      if (request.action === 'prepare') {
        if (!request.request) return { status: 'blocked', operationStatus: 'blocked', reason: 'prepare requires sessionId, intent, and targets' }
        return manager.prepare(request.request, signal)
      }
      if (!request.proposalId) return { status: 'blocked', operationStatus: 'blocked', reason: `${request.action} requires proposalId` }
      if (request.action === 'confirm') return manager.confirm(request.proposalId, request.confirmationDigest ?? '', signal)
      if (request.action === 'reject') return manager.reject(request.proposalId)
      return manager.release(request.proposalId, signal)
    },
  }
}

function proposalInput(input: unknown): {
  action: 'prepare' | 'confirm' | 'reject' | 'release'
  request?: ChangeProposalRequest
  proposalId?: string
  confirmationDigest?: string
} {
  if (!isRecord(input)) return { action: 'prepare' }
  const action = input.action === 'confirm' || input.action === 'reject' || input.action === 'release' ? input.action : 'prepare'
  const sessionId = typeof input.sessionId === 'string' ? input.sessionId : ''
  const intent = typeof input.intent === 'string' ? input.intent : ''
  const targets = Array.isArray(input.targets) ? input.targets.flatMap(parseTarget) : []
  const evidenceIds = Array.isArray(input.evidenceIds) ? input.evidenceIds.filter((value): value is string => typeof value === 'string') : undefined
  return {
    action,
    request: action === 'prepare' ? { sessionId, intent, targets, evidenceIds } : undefined,
    proposalId: typeof input.proposalId === 'string' ? input.proposalId : undefined,
    confirmationDigest: typeof input.confirmationDigest === 'string' ? input.confirmationDigest : undefined,
  }
}

function parseTarget(value: unknown): ChangeProposalRequest['targets'] {
  if (!isRecord(value) || typeof value.relativePath !== 'string') return []
  const operation = value.operation
  if (operation !== 'add' && operation !== 'modify' && operation !== 'delete') return []
  return [{
    relativePath: value.relativePath,
    operation,
    rationale: typeof value.rationale === 'string' ? value.rationale : undefined,
  }]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
