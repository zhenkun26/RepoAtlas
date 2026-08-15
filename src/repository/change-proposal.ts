import { execFile } from 'node:child_process'
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { isSensitivePath, redactSecretLike } from '../safety/content-policy.ts'
import { checkWorkspacePath, isWithin } from '../safety/path-policy.ts'
import { isPathCoveredByScope } from './evidence-cache.ts'
import type {
  AnalysisSession,
  ChangeProposal,
  ChangeProposalOperation,
  ChangeProposalRequest,
  ChangeProposalResult,
  ChangeProposalTarget,
  ChangeProposalWorktree,
  RepoAtlasConfig,
} from '../types.ts'

const execFileAsync = promisify(execFile)

export interface ChangeProposalLimits {
  maxTargets: number
  maxEvidenceIds: number
  maxTextBytes: number
  expirationMs: number
}

export const DEFAULT_CHANGE_PROPOSAL_LIMITS: ChangeProposalLimits = {
  maxTargets: 32,
  maxEvidenceIds: 64,
  maxTextBytes: 4_096,
  expirationMs: 15 * 60 * 1_000,
}

interface RepositoryRevision {
  repositoryRoot: string
  baseRevision: string
}

interface InspectedWorktree extends ChangeProposalWorktree {
  dirty: boolean
}

export interface GitWorktreeAdapter {
  discover(workspaceRoot: string, signal?: AbortSignal): Promise<RepositoryRevision>
  create(repositoryRoot: string, baseRevision: string, signal?: AbortSignal): Promise<ChangeProposalWorktree>
  inspect(repositoryRoot: string, worktree: ChangeProposalWorktree, signal?: AbortSignal): Promise<InspectedWorktree>
  remove(repositoryRoot: string, worktree: ChangeProposalWorktree, signal?: AbortSignal): Promise<void>
}

export interface ChangeProposalManagerOptions {
  adapter?: GitWorktreeAdapter
  limits?: Partial<ChangeProposalLimits>
}

export class ChangeProposalManager {
  private readonly sessions = new Map<string, AnalysisSession>()
  private readonly proposals = new Map<string, ChangeProposal>()
  private readonly config: RepoAtlasConfig
  private readonly adapter: GitWorktreeAdapter
  private readonly limits: ChangeProposalLimits

  constructor(config: RepoAtlasConfig, options: ChangeProposalManagerOptions = {}) {
    this.config = config
    this.adapter = options.adapter ?? createNodeGitWorktreeAdapter()
    this.limits = {
      ...DEFAULT_CHANGE_PROPOSAL_LIMITS,
      ...options.limits,
    }
    for (const [name, value] of Object.entries(this.limits)) {
      if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive safe integer`)
    }
  }

  registerSession(session: AnalysisSession): void {
    if (session.workspaceRoot !== this.config.workspaceRoot) return
    this.sessions.set(session.sessionId, session)
  }

  async prepare(request: ChangeProposalRequest, signal?: AbortSignal): Promise<ChangeProposalResult> {
    if (signal?.aborted) return blockedResult('interrupted', 'proposal preparation was interrupted before validation')
    const session = this.sessions.get(request.sessionId)
    if (!session) return blockedResult('blocked', 'the requested analysis session is not available in this session')
    if (!session.goal.confirmed) return blockedResult('blocked', 'a confirmed GoalSpec is required before preparing a change proposal')
    if (!request.intent.trim()) return blockedResult('blocked', 'a user-supplied change intent is required')
    if (!Array.isArray(request.targets) || request.targets.length === 0) return blockedResult('blocked', 'at least one target operation is required')

    let revision: RepositoryRevision
    try {
      revision = await this.adapter.discover(session.workspaceRoot, signal)
    } catch (error) {
      return blockedResult(signal?.aborted ? 'interrupted' : 'blocked', `local Git revision discovery failed: ${redactError(error)}`)
    }
    if (!isWithin(revision.repositoryRoot, session.workspaceRoot)) {
      return blockedResult('blocked', 'the confirmed workspace is not contained by its Git repository root')
    }

    const validation = validateTargets(request.targets, session, this.config, this.limits)
    if (!validation.targets.some((target) => target.status === 'confirmed')) {
      return blockedResult('blocked', validation.limitations[0] ?? 'no target operation is within the confirmed scope')
    }
    const evidenceIds = [...new Set((request.evidenceIds ?? []).filter((id) => session.evidence.some((item) => item.evidenceId === id)))].slice(0, this.limits.maxEvidenceIds)
    const unknownEvidenceCount = (request.evidenceIds ?? []).filter((id) => !session.evidence.some((item) => item.evidenceId === id)).length
    const limitations = [...validation.limitations]
    if (unknownEvidenceCount) limitations.push(`${unknownEvidenceCount} evidence id(s) were not found in the confirmed session`)
    const intent = boundedRedactedText(request.intent, this.limits.maxTextBytes)
    const proposal: ChangeProposal = {
      proposalId: `proposal-${randomUUID()}`,
      sessionId: session.sessionId,
      workspaceRoot: session.workspaceRoot,
      repositoryRoot: revision.repositoryRoot,
      baseRevision: revision.baseRevision,
      intent,
      targets: validation.targets,
      evidenceIds,
      limitations: boundedList(limitations, this.limits.maxTextBytes),
      risks: boundedList(deriveRisks(validation.targets), this.limits.maxTextBytes),
      confirmationDigest: '',
      status: 'awaiting-confirmation',
      operationStatus: 'proposal',
      expiresAt: new Date(Date.now() + this.limits.expirationMs).toISOString(),
      patchApplied: false,
      commitCreated: false,
      pushPerformed: false,
      createdAt: new Date().toISOString(),
    }
    proposal.confirmationDigest = createProposalDigest(proposal)
    this.proposals.set(proposal.proposalId, proposal)
    return resultFor(proposal, 'proposal prepared; explicit digest confirmation is required before worktree creation')
  }

  async confirm(proposalId: string, confirmationDigest: string, signal?: AbortSignal): Promise<ChangeProposalResult> {
    const proposal = this.proposals.get(proposalId)
    if (!proposal) return blockedResult('blocked', 'proposal is unknown to the current session')
    if (proposal.status !== 'awaiting-confirmation') return resultFor(proposal, 'proposal is no longer awaiting confirmation')
    if (signal?.aborted) return mutateStatus(proposal, 'interrupted', 'blocked', 'proposal confirmation was interrupted before worktree creation')
    if (Date.now() >= Date.parse(proposal.expiresAt)) return mutateStatus(proposal, 'blocked', 'blocked', 'proposal confirmation window has expired')
    if (!sameDigest(proposal.confirmationDigest, confirmationDigest)) return resultFor(proposal, 'confirmation digest does not match the pending proposal')

    let currentRevision: RepositoryRevision
    try {
      currentRevision = await this.adapter.discover(proposal.workspaceRoot, signal)
    } catch (error) {
      return mutateStatus(proposal, signal?.aborted ? 'interrupted' : 'blocked', 'blocked', `local Git revision discovery failed: ${redactError(error)}`)
    }
    if (currentRevision.baseRevision !== proposal.baseRevision || path.resolve(currentRevision.repositoryRoot) !== path.resolve(proposal.repositoryRoot)) {
      return mutateStatus(proposal, 'blocked', 'blocked', 'the repository revision or root changed after proposal preparation')
    }
    try {
      const worktree = await this.adapter.create(currentRevision.repositoryRoot, proposal.baseRevision, signal)
      if (isWithin(proposal.workspaceRoot, worktree.path)) throw new Error('created worktree is inside the source workspace')
      proposal.worktree = worktree
      proposal.status = 'confirmed'
      proposal.operationStatus = 'worktree-created'
      return resultFor(proposal, 'isolated worktree created; patch, commit, and push were not performed')
    } catch (error) {
      return mutateStatus(proposal, signal?.aborted ? 'interrupted' : 'blocked', 'blocked', `isolated worktree creation failed: ${redactError(error)}`)
    }
  }

  reject(proposalId: string): ChangeProposalResult {
    const proposal = this.proposals.get(proposalId)
    if (!proposal) return blockedResult('blocked', 'proposal is unknown to the current session')
    if (proposal.status !== 'awaiting-confirmation') return resultFor(proposal, 'proposal is no longer awaiting confirmation')
    proposal.status = 'rejected'
    proposal.operationStatus = 'blocked'
    return resultFor(proposal, 'proposal rejected; no worktree was created')
  }

  async release(proposalId: string, signal?: AbortSignal): Promise<ChangeProposalResult> {
    const proposal = this.proposals.get(proposalId)
    if (!proposal) return blockedResult('blocked', 'proposal is unknown to the current session')
    if (proposal.status !== 'confirmed' || !proposal.worktree) return resultFor(proposal, 'only a confirmed proposal with a managed worktree can be released')
    if (signal?.aborted) return mutateStatus(proposal, 'interrupted', 'blocked', 'worktree release was interrupted')
    try {
      const inspected = await this.adapter.inspect(proposal.repositoryRoot, proposal.worktree, signal)
      if (inspected.identity !== proposal.worktree.identity) return mutateStatus(proposal, 'blocked', 'blocked', 'worktree identity no longer matches the session-owned worktree')
      if (inspected.dirty) return mutateStatus(proposal, 'blocked', 'blocked', 'worktree has uncommitted changes; refusing force removal')
      await this.adapter.remove(proposal.repositoryRoot, proposal.worktree, signal)
      proposal.status = 'released'
      proposal.operationStatus = 'released'
      return resultFor(proposal, 'session-owned clean worktree released')
    } catch (error) {
      return mutateStatus(proposal, signal?.aborted ? 'interrupted' : 'blocked', 'blocked', `worktree release failed: ${redactError(error)}`)
    }
  }
}

export function createNodeGitWorktreeAdapter(): GitWorktreeAdapter {
  return {
    async discover(workspaceRoot, signal) {
      const resolvedWorkspace = await fs.realpath(path.resolve(workspaceRoot))
      const repositoryRoot = path.resolve(await runGit(['-C', resolvedWorkspace, 'rev-parse', '--show-toplevel'], resolvedWorkspace, signal))
      const baseRevision = await runGit(['-C', repositoryRoot, 'rev-parse', '--verify', 'HEAD^{commit}'], repositoryRoot, signal)
      return { repositoryRoot, baseRevision }
    },
    async create(repositoryRoot, baseRevision, signal) {
      const target = await fs.mkdtemp(path.join(os.tmpdir(), 'repo-atlas-proposal-'))
      try {
        await runGit(['-C', repositoryRoot, 'worktree', 'add', '--detach', target, baseRevision], repositoryRoot, signal)
        const canonicalTarget = await fs.realpath(target)
        const worktree: ChangeProposalWorktree = {
          path: canonicalTarget,
          baseRevision,
          identity: worktreeIdentity(canonicalTarget, baseRevision),
        }
        const inspected = await this.inspect(repositoryRoot, worktree, signal)
        if (inspected.identity !== worktree.identity) throw new Error('created worktree identity could not be verified')
        return worktree
      } catch (error) {
        await fs.rm(target, { recursive: true, force: true }).catch(() => undefined)
        throw error
      }
    },
    async inspect(repositoryRoot, worktree, signal) {
      const listing = await runGit(['-C', repositoryRoot, 'worktree', 'list', '--porcelain'], repositoryRoot, signal)
      const canonicalTarget = await fs.realpath(worktree.path)
      const record = parseWorktreeListing(listing, canonicalTarget)
      if (!record || record.baseRevision !== worktree.baseRevision) throw new Error('managed worktree is not present at the expected revision')
      const status = await runGit(['-C', worktree.path, 'status', '--porcelain', '--untracked-files=all'], worktree.path, signal)
      return { ...worktree, path: canonicalTarget, identity: worktreeIdentity(canonicalTarget, record.baseRevision), dirty: status.length > 0 }
    },
    async remove(repositoryRoot, worktree, signal) {
      await runGit(['-C', repositoryRoot, 'worktree', 'remove', worktree.path], repositoryRoot, signal)
    },
  }
}

function validateTargets(
  requests: readonly { relativePath: string; operation: ChangeProposalOperation; rationale?: string }[],
  session: AnalysisSession,
  config: RepoAtlasConfig,
  limits: ChangeProposalLimits,
): { targets: ChangeProposalTarget[]; limitations: string[] } {
  const targets: ChangeProposalTarget[] = []
  const limitations: string[] = []
  const seen = new Set<string>()
  for (const request of requests) {
    if (targets.length >= limits.maxTargets) {
      limitations.push('proposal target budget exhausted')
      break
    }
    const rawPath = String(request.relativePath ?? '')
    const check = checkWorkspacePath(session.workspaceRoot, rawPath)
    const normalized = check.allowed ? path.relative(session.workspaceRoot, check.absolutePath).replaceAll(path.sep, '/') || '.' : rawPath.replaceAll('\\', '/')
    if (seen.has(normalized)) {
      limitations.push(`duplicate target skipped: ${normalized}`)
      continue
    }
    seen.add(normalized)
    const operation = request.operation
    const rationale = boundedRedactedText(request.rationale ?? '用户未提供额外理由', limits.maxTextBytes)
    if (!isProposalOperation(operation)) {
      limitations.push(`${normalized}: unsupported target operation`)
      continue
    }
    if (!check.allowed) {
      targets.push({ relativePath: normalized, operation, rationale, status: 'uncovered', reason: check.reason })
      limitations.push(`${normalized}: ${check.reason}`)
      continue
    }
    if (isSensitivePath(normalized, config.sensitiveFilePatterns)) {
      targets.push({ relativePath: normalized, operation, rationale, status: 'uncovered', reason: 'sensitive path is not eligible for proposal targets' })
      limitations.push(`${normalized}: sensitive path is not eligible`)
      continue
    }
    if (config.excludeDirs.includes(normalized.split('/')[0] ?? '')) {
      targets.push({ relativePath: normalized, operation, rationale, status: 'uncovered', reason: 'excluded directory is not eligible for proposal targets' })
      limitations.push(`${normalized}: excluded directory is not eligible`)
      continue
    }
    if (!isPathCoveredByScope(normalized, session.goal.scope)) {
      targets.push({ relativePath: normalized, operation, rationale, status: 'uncovered', reason: 'target is outside the confirmed GoalSpec scope' })
      limitations.push(`${normalized}: outside confirmed scope`)
      continue
    }
    targets.push({ relativePath: normalized, operation, rationale, status: 'confirmed' })
  }
  return { targets, limitations }
}

function deriveRisks(targets: readonly ChangeProposalTarget[]): string[] {
  return targets.filter((target) => target.status === 'confirmed' && target.operation === 'delete').map((target) => `delete operation requires explicit review: ${target.relativePath}`)
}

function createProposalDigest(proposal: ChangeProposal): string {
  const payload = JSON.stringify({
    proposalId: proposal.proposalId,
    sessionId: proposal.sessionId,
    workspaceRoot: path.resolve(proposal.workspaceRoot),
    baseRevision: proposal.baseRevision,
    expiresAt: proposal.expiresAt,
    intent: proposal.intent,
    targets: proposal.targets,
    evidenceIds: proposal.evidenceIds,
  })
  return createHash('sha256').update(payload).digest('hex')
}

function sameDigest(expected: string, received: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(received)) return false
  const left = Buffer.from(expected, 'hex')
  const right = Buffer.from(received, 'hex')
  return left.length === right.length && timingSafeEqual(left, right)
}

function worktreeIdentity(worktreePath: string, baseRevision: string): string {
  return createHash('sha256').update(`${path.resolve(worktreePath)}\0${baseRevision}`).digest('hex').slice(0, 32)
}

function parseWorktreeListing(listing: string, targetPath: string): { path: string; baseRevision: string } | undefined {
  const blocks = listing.split(/\n(?=worktree )/).map((block) => block.split('\n'))
  for (const lines of blocks) {
    const worktreePath = lines.find((line) => line.startsWith('worktree '))?.slice('worktree '.length)
    const baseRevision = lines.find((line) => line.startsWith('HEAD '))?.slice('HEAD '.length)
    if (worktreePath && baseRevision && path.resolve(worktreePath) === path.resolve(targetPath)) return { path: worktreePath, baseRevision }
  }
  return undefined
}

async function runGit(args: readonly string[], cwd: string, signal?: AbortSignal): Promise<string> {
  const result = await execFileAsync('git', [...args], {
    cwd,
    shell: false,
    windowsHide: true,
    timeout: 15_000,
    maxBuffer: 128 * 1024,
    signal,
  })
  return result.stdout.trim()
}

function boundedRedactedText(value: string, maxBytes: number): string {
  const redacted = redactSecretLike(value).text
  if (Buffer.byteLength(redacted) <= maxBytes) return redacted
  let result = ''
  for (const character of redacted) {
    if (Buffer.byteLength(`${result}${character}…`) > maxBytes) break
    result += character
  }
  return `${result}…`
}

function boundedList(values: readonly string[], maxBytes: number): string[] {
  const result: string[] = []
  let bytes = 0
  for (const value of values) {
    const nextBytes = Buffer.byteLength(value)
    if (bytes + nextBytes > maxBytes) break
    result.push(value)
    bytes += nextBytes
  }
  return result
}

function resultFor(proposal: ChangeProposal, reason: string): ChangeProposalResult {
  return { status: proposal.status, operationStatus: proposal.operationStatus, reason, proposal: cloneProposal(proposal) }
}

function mutateStatus(proposal: ChangeProposal, status: ChangeProposal['status'], operationStatus: ChangeProposal['operationStatus'], reason: string): ChangeProposalResult {
  proposal.status = status
  proposal.operationStatus = operationStatus
  return resultFor(proposal, reason)
}

function blockedResult(status: Extract<ChangeProposal['status'], 'blocked' | 'interrupted'>, reason: string): ChangeProposalResult {
  return { status, operationStatus: 'blocked', reason }
}

function cloneProposal(proposal: ChangeProposal): ChangeProposal {
  return {
    ...proposal,
    targets: proposal.targets.map((target) => ({ ...target })),
    evidenceIds: [...proposal.evidenceIds],
    limitations: [...proposal.limitations],
    risks: [...proposal.risks],
    worktree: proposal.worktree ? { ...proposal.worktree } : undefined,
  }
}

function isProposalOperation(value: unknown): value is ChangeProposalOperation {
  return value === 'add' || value === 'modify' || value === 'delete'
}

function redactError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.replaceAll(/(?:api[_-]?key|token|password|secret)\s*[:=]\s*\S+/gi, '[REDACTED_SECRET]').slice(0, 400)
}
