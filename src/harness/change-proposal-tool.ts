import type { ChangeProposalOperation, ChangeProposalRequest } from '../types.ts'
import { ChangeProposalManager } from '../repository/change-proposal.ts'
import type { HarnessTool, HarnessToolExecution } from './public.ts'

export function createChangeProposalTool(manager: ChangeProposalManager): HarnessTool {
  return {
    name: 'repo_atlas_change_proposal',
    description: '准备、确认、拒绝或释放当前 session 的隔离代码变更提案；支持显式确认后将有界补丁应用到隔离 worktree，不会提交或推送。',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['prepare', 'confirm', 'reject', 'release', 'prepare-patch', 'confirm-patch', 'reject-patch'] },
        sessionId: { type: 'string' },
        intent: { type: 'string' },
        targets: { type: 'array' },
        evidenceIds: { type: 'array' },
        proposalId: { type: 'string' },
        confirmationDigest: { type: 'string' },
        patchId: { type: 'string' },
        patchText: { type: 'string' },
        patchConfirmationDigest: { type: 'string' },
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
      if (request.action === 'prepare-patch') {
        if (!request.proposalId || request.patchText === undefined) return { status: 'blocked', operationStatus: 'blocked', reason: 'prepare-patch requires proposalId and patchText' }
        return manager.preparePatch({ proposalId: request.proposalId, patchText: request.patchText }, signal)
      }
      if (request.action === 'confirm-patch') {
        if (!request.patchId) return { status: 'blocked', operationStatus: 'blocked', reason: 'confirm-patch requires patchId' }
        return manager.confirmPatch(request.patchId, request.patchConfirmationDigest ?? '', signal)
      }
      if (request.action === 'reject-patch') {
        if (!request.patchId) return { status: 'blocked', operationStatus: 'blocked', reason: 'reject-patch requires patchId' }
        return manager.rejectPatch(request.patchId)
      }
      if (!request.proposalId) return { status: 'blocked', operationStatus: 'blocked', reason: `${request.action} requires proposalId` }
      if (request.action === 'confirm') return manager.confirm(request.proposalId, request.confirmationDigest ?? '', signal)
      if (request.action === 'reject') return manager.reject(request.proposalId)
      return manager.release(request.proposalId, signal)
    },
  }
}

function proposalInput(input: unknown): {
  action: 'prepare' | 'confirm' | 'reject' | 'release' | 'prepare-patch' | 'confirm-patch' | 'reject-patch'
  request?: ChangeProposalRequest
  proposalId?: string
  confirmationDigest?: string
  patchId?: string
  patchText?: string
  patchConfirmationDigest?: string
} {
  if (!isRecord(input)) return { action: 'prepare' }
  const action = input.action === 'confirm' || input.action === 'reject' || input.action === 'release' || input.action === 'prepare-patch' || input.action === 'confirm-patch' || input.action === 'reject-patch' ? input.action : 'prepare'
  const sessionId = typeof input.sessionId === 'string' ? input.sessionId : ''
  const intent = typeof input.intent === 'string' ? input.intent : ''
  const targets = Array.isArray(input.targets) ? input.targets.flatMap(parseTarget) : []
  const evidenceIds = Array.isArray(input.evidenceIds) ? input.evidenceIds.filter((value): value is string => typeof value === 'string') : undefined
  return {
    action,
    request: action === 'prepare' ? { sessionId, intent, targets, evidenceIds } : undefined,
    proposalId: typeof input.proposalId === 'string' ? input.proposalId : undefined,
    confirmationDigest: typeof input.confirmationDigest === 'string' ? input.confirmationDigest : undefined,
    patchId: typeof input.patchId === 'string' ? input.patchId : undefined,
    patchText: typeof input.patchText === 'string' ? input.patchText : undefined,
    patchConfirmationDigest: typeof input.patchConfirmationDigest === 'string' ? input.patchConfirmationDigest : undefined,
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
