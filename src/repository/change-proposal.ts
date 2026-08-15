import { execFile, spawn } from 'node:child_process'
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
  ChangeProposalCommit,
  ChangeProposalCommitRequest,
  ChangeProposalCommitExecutionStatus,
  ChangeProposalEvent,
  ChangeProposalEventPhase,
  ChangeProposalHistoryRequest,
  ChangeProposalHistoryResult,
  ChangeProposalLanding,
  ChangeProposalLandingRequest,
  ChangeProposalLandingExecutionStatus,
  ChangeProposalLiveInspection,
  ChangeProposalLiveSourceObservation,
  ChangeProposalLiveWorktreeObservation,
  ChangeProposalListRequest,
  ChangeProposalListResult,
  ChangeProposalPatch,
  ChangeProposalPatchFileSummary,
  ChangeProposalPatchRequest,
  ChangeProposalPatchExport,
  ChangeProposalPatchSummary,
  ChangeProposalOperation,
  ChangeProposalRequest,
  ChangeProposalRecoveryAction,
  ChangeProposalRecoveryRecommendation,
  ChangeProposalRecoveryResult,
  ChangeProposalResult,
  ChangeProposalSummary,
  ChangeProposalTarget,
  ChangeProposalVerification,
  ChangeProposalVerifyPatchRequest,
  ChangeProposalWorktree,
  RepoAtlasConfig,
} from '../types.ts'

const execFileAsync = promisify(execFile)

export interface ChangeProposalLimits {
  maxTargets: number
  maxEvidenceIds: number
  maxTextBytes: number
  maxHistoryEvents: number
  expirationMs: number
  maxPatchBytes: number
  maxPatchFiles: number
  maxPatchHunks: number
  maxPatchLineBytes: number
}

export const DEFAULT_CHANGE_PROPOSAL_LIMITS: ChangeProposalLimits = {
  maxTargets: 32,
  maxEvidenceIds: 64,
  maxTextBytes: 4_096,
  maxHistoryEvents: 128,
  expirationMs: 15 * 60 * 1_000,
  maxPatchBytes: 128 * 1_024,
  maxPatchFiles: 32,
  maxPatchHunks: 128,
  maxPatchLineBytes: 8 * 1_024,
}

export const DEFAULT_CHANGE_PROPOSAL_LIST_LIMIT = 50
export const MAX_CHANGE_PROPOSAL_LIST_LIMIT = 100

interface RepositoryRevision {
  repositoryRoot: string
  baseRevision: string
}

interface InspectedWorktree extends ChangeProposalWorktree {
  dirty: boolean
  changedPaths: string[]
}

interface InspectedSourceWorktree {
  path: string
  repositoryRoot: string
  revision: string
  dirty: boolean
}

export interface GitWorktreeAdapter {
  discover(workspaceRoot: string, signal?: AbortSignal): Promise<RepositoryRevision>
  create(repositoryRoot: string, baseRevision: string, signal?: AbortSignal): Promise<ChangeProposalWorktree>
  inspect(repositoryRoot: string, worktree: ChangeProposalWorktree, signal?: AbortSignal): Promise<InspectedWorktree>
  inspectSource(repositoryRoot: string, sourceWorkspaceRoot: string, signal?: AbortSignal): Promise<InspectedSourceWorktree>
  applyPatch(repositoryRoot: string, worktree: ChangeProposalWorktree, patchText: string, workspaceRelativeRoot: string, signal?: AbortSignal): Promise<void>
  commit(repositoryRoot: string, worktree: ChangeProposalWorktree, repositoryRelativePaths: readonly string[], commitMessage: string, signal?: AbortSignal): Promise<string>
  land(repositoryRoot: string, sourceWorkspaceRoot: string, expectedSourceRevision: string, commitRevision: string, signal?: AbortSignal): Promise<string>
  remove(repositoryRoot: string, worktree: ChangeProposalWorktree, signal?: AbortSignal): Promise<void>
}

export interface ChangeProposalVerificationExecution {
  callId?: string
  agent?: { session: { header?: { cwd?: string } } }
}

export interface ChangeProposalVerificationRunner {
  run(request: {
    recipeId: string
    worktree: ChangeProposalWorktree
    execution?: ChangeProposalVerificationExecution
    signal?: AbortSignal
  }): Promise<ChangeProposalVerification>
}

export interface ChangeProposalCommitExecution extends ChangeProposalVerificationExecution {}

export interface ChangeProposalCommitApproval {
  allowed: boolean
  auditId?: string
  reason: string
}

export interface ChangeProposalCommitAuthorizer {
  authorize(request: {
    commitId: string
    confirmationDigest: string
    commitMessage: string
    worktree: ChangeProposalWorktree
    execution?: ChangeProposalCommitExecution
    signal?: AbortSignal
  }): Promise<ChangeProposalCommitApproval>
}

export interface ChangeProposalLandingExecution extends ChangeProposalVerificationExecution {}

export interface ChangeProposalLandingApproval {
  allowed: boolean
  auditId?: string
  reason: string
}

export interface ChangeProposalLandingAuthorizer {
  authorize(request: {
    landingId: string
    confirmationDigest: string
    sourcePath: string
    commitRevision: string
    execution?: ChangeProposalLandingExecution
    signal?: AbortSignal
  }): Promise<ChangeProposalLandingApproval>
}

interface StoredPatchDraft {
  proposalId: string
  patchText: string
  patch: ChangeProposalPatch
}

interface StoredCommitDraft {
  proposalId: string
  commit: ChangeProposalCommit
}

interface StoredLandingDraft {
  proposalId: string
  landing: ChangeProposalLanding
}

type ChangeProposalEventRecorder = (phase: ChangeProposalEventPhase, reason: string) => void

const proposalEventRecorders = new WeakMap<ChangeProposal, ChangeProposalEventRecorder>()

interface ParsedPatch {
  canonicalText: string
  summary: ChangeProposalPatchSummary
}

class PatchApplicationError extends Error {
  readonly uncertain: boolean

  constructor(message: string, uncertain: boolean) {
    super(message)
    this.name = 'PatchApplicationError'
    this.uncertain = uncertain
  }
}

class CommitOperationError extends Error {
  readonly uncertain: boolean

  constructor(message: string, uncertain: boolean) {
    super(message)
    this.name = 'CommitOperationError'
    this.uncertain = uncertain
  }
}

class LandingOperationError extends Error {
  readonly uncertain: boolean

  constructor(message: string, uncertain: boolean) {
    super(message)
    this.name = 'LandingOperationError'
    this.uncertain = uncertain
  }
}

export interface ChangeProposalManagerOptions {
  adapter?: GitWorktreeAdapter
  limits?: Partial<ChangeProposalLimits>
}

export class ChangeProposalManager {
  private readonly sessions = new Map<string, AnalysisSession>()
  private readonly proposals = new Map<string, ChangeProposal>()
  private readonly histories = new Map<string, ChangeProposalEvent[]>()
  private readonly patches = new Map<string, StoredPatchDraft>()
  private readonly commits = new Map<string, StoredCommitDraft>()
  private readonly landings = new Map<string, StoredLandingDraft>()
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

  inspect(proposalId: string): ChangeProposalResult {
    const proposal = this.proposals.get(proposalId)
    if (!proposal) return blockedResult('blocked', 'proposal is unknown to the current session')
    return resultFor(proposal, 'session-only proposal lifecycle snapshot returned; live workspace and Git state were not inspected')
  }

  async inspectLive(proposalId: string, signal?: AbortSignal): Promise<ChangeProposalResult> {
    const proposal = this.proposals.get(proposalId)
    if (!proposal) return blockedResult('blocked', 'proposal is unknown to the current session')
    if (signal?.aborted) {
      return resultForWithLive(proposal, 'live inspection was interrupted before adapter access', interruptedLiveInspection(proposal, this.limits.maxTextBytes))
    }

    let source: ChangeProposalLiveSourceObservation
    try {
      const inspected = await this.adapter.inspectSource(proposal.repositoryRoot, proposal.workspaceRoot, signal)
      source = {
        status: 'available',
        reason: 'source workspace was inspected read-only',
        clean: !inspected.dirty,
        revision: inspected.revision,
        baseRevisionMatches: inspected.revision === proposal.baseRevision,
        repositoryRootMatches: path.resolve(inspected.repositoryRoot) === path.resolve(proposal.repositoryRoot),
        workspacePathMatches: path.resolve(inspected.path) === path.resolve(proposal.workspaceRoot),
      }
    } catch (error) {
      source = { status: 'unknown', reason: boundedRedactedText(`source workspace inspection failed: ${redactError(error)}`, this.limits.maxTextBytes) }
    }

    let worktree: ChangeProposalLiveWorktreeObservation
    if (!proposal.worktree) {
      worktree = { status: 'not-applicable', reason: 'proposal has no managed worktree to inspect' }
    } else {
      try {
        const inspected = await this.adapter.inspect(proposal.repositoryRoot, proposal.worktree, signal)
        worktree = {
          status: 'available',
          reason: 'session-owned worktree was inspected read-only',
          clean: !inspected.dirty,
          baseRevision: inspected.baseRevision,
          baseRevisionMatches: inspected.baseRevision === proposal.baseRevision,
          identityMatches: inspected.identity === proposal.worktree.identity,
          changedPathCount: inspected.changedPaths.length,
        }
      } catch (error) {
        worktree = { status: 'unknown', reason: boundedRedactedText(`managed worktree inspection failed: ${redactError(error)}`, this.limits.maxTextBytes) }
      }
    }

    const live = createLiveInspection(source, worktree)
    return resultForWithLive(proposal, live.reason, live)
  }

  list(request: ChangeProposalListRequest = {}): ChangeProposalListResult {
    const limit = normalizeProposalListLimit(request.limit)
    if (limit === undefined) return blockedProposalList('proposal list limit must be a positive safe integer no greater than 100')
    const ordered = [...this.proposals.values()].sort(compareProposalCreation)
    const proposals = ordered.slice(0, limit).map(proposalSummary)
    return {
      status: 'available',
      reason: 'session-only proposal summaries returned; live workspace and Git state were not inspected',
      proposals,
      total: ordered.length,
      returned: proposals.length,
      truncated: ordered.length > limit,
      sessionOnly: true,
    }
  }

  history(request: ChangeProposalHistoryRequest): ChangeProposalHistoryResult {
    const limit = normalizeProposalListLimit(request.limit)
    if (limit === undefined) return blockedProposalHistory('proposal history limit must be a positive safe integer no greater than 100')
    const proposal = this.proposals.get(request.proposalId)
    if (!proposal) return blockedProposalHistory('proposal is unknown to the current session')
    const retained = this.histories.get(proposal.proposalId) ?? []
    const events = retained.slice(Math.max(0, retained.length - limit)).map(cloneProposalEvent)
    return {
      status: 'available',
      reason: 'session-only lifecycle events returned; live workspace and Git state were not inspected',
      proposalId: proposal.proposalId,
      events,
      total: retained.length,
      returned: events.length,
      truncated: retained.length > limit,
      sessionOnly: true,
    }
  }

  inspectRecovery(proposalId: string): ChangeProposalRecoveryResult {
    const proposal = this.proposals.get(proposalId)
    if (!proposal) return blockedProposalRecovery('proposal is unknown to the current session')
    const decision = recoveryDecision(proposal)
    return {
      status: 'available',
      reason: 'session-only recovery guidance returned; no lifecycle or live Git state was changed',
      guidance: {
        proposalId: proposal.proposalId,
        proposal: proposalSummary(proposal),
        recommendation: decision.recommendation,
        allowedActions: [...decision.allowedActions],
        manualReviewRequired: decision.manualReviewRequired,
        reason: boundedRedactedText(decision.reason, this.limits.maxTextBytes),
        sessionOnly: true,
      },
      sessionOnly: true,
    }
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
      executionStatus: {
        patch: 'patch-not-applied',
        commit: 'commit-not-created',
        landing: 'landing-not-performed',
        push: 'push-not-performed',
      },
      patchApplied: false,
      commitCreated: false,
      sourceLanded: false,
      pushPerformed: false,
      createdAt: new Date().toISOString(),
    }
    proposal.confirmationDigest = createProposalDigest(proposal)
    this.proposals.set(proposal.proposalId, proposal)
    this.attachEventRecorder(proposal)
    recordProposalEvent(proposal, 'proposal', 'proposal prepared; explicit digest confirmation is required before worktree creation')
    return resultFor(proposal, 'proposal prepared; explicit digest confirmation is required before worktree creation')
  }

  private attachEventRecorder(proposal: ChangeProposal): void {
    const events: ChangeProposalEvent[] = []
    this.histories.set(proposal.proposalId, events)
    proposalEventRecorders.set(proposal, (phase, reason) => {
      events.push({
        eventId: `event-${randomUUID()}`,
        proposalId: proposal.proposalId,
        phase,
        status: proposal.status,
        operationStatus: proposal.operationStatus,
        executionStatus: { ...proposal.executionStatus },
        reason: boundedRedactedText(reason, this.limits.maxTextBytes),
        createdAt: new Date().toISOString(),
        sessionOnly: true,
      })
      while (events.length > this.limits.maxHistoryEvents) events.shift()
    })
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
      recordProposalEvent(proposal, 'proposal', 'isolated worktree created; patch, commit, and push were not performed')
      return resultFor(proposal, 'isolated worktree created; patch, commit, and push were not performed')
    } catch (error) {
      return mutateStatus(proposal, signal?.aborted ? 'interrupted' : 'blocked', 'blocked', `isolated worktree creation failed: ${redactError(error)}`)
    }
  }

  async preparePatch(request: ChangeProposalPatchRequest, signal?: AbortSignal): Promise<ChangeProposalResult> {
    if (signal?.aborted) return blockedResult('interrupted', 'patch preparation was interrupted before validation')
    const proposal = this.proposals.get(request.proposalId)
    if (!proposal) return blockedResult('blocked', 'proposal is unknown to the current session')
    if (proposal.status !== 'confirmed' || !proposal.worktree) return resultFor(proposal, 'patches require a confirmed proposal with a managed worktree')
    if (proposal.patch) return resultFor(proposal, 'this proposal already has a patch draft; terminal patch states are not replayable')
    const session = this.sessions.get(proposal.sessionId)
    if (!session) return resultFor(proposal, 'the analysis session for this proposal is no longer available')
    let inspected: InspectedWorktree
    try {
      inspected = await this.adapter.inspect(proposal.repositoryRoot, proposal.worktree, signal)
    } catch (error) {
      return resultFor(proposal, `patch worktree inspection failed: ${redactError(error)}`)
    }
    if (inspected.identity !== proposal.worktree.identity) return resultFor(proposal, 'worktree identity no longer matches the session-owned worktree')
    if (inspected.baseRevision !== proposal.baseRevision) return resultFor(proposal, 'worktree base revision no longer matches the proposal')
    if (inspected.dirty || inspected.changedPaths.length > 0) return resultFor(proposal, 'patch preparation requires a clean worktree')

    const validation = validatePatch(request.patchText, proposal, session, this.config, this.limits)
    if (!validation.parsed) return resultFor(proposal, validation.reason)
    const patch: ChangeProposalPatch = {
      patchId: `patch-${randomUUID()}`,
      confirmationDigest: '',
      status: 'awaiting-confirmation',
      summary: validation.parsed.summary,
      limitations: [],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.limits.expirationMs).toISOString(),
      executionStatus: 'patch-not-applied',
      verificationStatus: 'not-run',
    }
    patch.confirmationDigest = createPatchDigest(proposal, patch, validation.parsed.canonicalText)
    proposal.patch = patch
    proposal.operationStatus = 'patch-awaiting-confirmation'
    this.patches.set(patch.patchId, { proposalId: proposal.proposalId, patchText: validation.parsed.canonicalText, patch })
    recordProposalEvent(proposal, 'patch', 'patch draft prepared; exact patch digest confirmation is required before application')
    return resultFor(proposal, 'patch draft prepared; exact patch digest confirmation is required before application')
  }

  reviewPatch(patchId: string): ChangeProposalResult {
    const draft = this.patches.get(patchId)
    if (!draft) return blockedResult('blocked', 'patch draft is unknown to the current session')
    const proposal = this.proposals.get(draft.proposalId)
    if (!proposal) return blockedResult('blocked', 'proposal for this patch draft is no longer available')
    return resultFor(proposal, 'patch review descriptor returned; no files were modified')
  }

  exportPatch(patchId: string, confirmationDigest: string): ChangeProposalResult {
    const draft = this.patches.get(patchId)
    if (!draft) return blockedResult('blocked', 'patch draft is unknown to the current session')
    const proposal = this.proposals.get(draft.proposalId)
    if (!proposal) return blockedResult('blocked', 'proposal for this patch draft is no longer available')
    if (!sameDigest(draft.patch.confirmationDigest, confirmationDigest)) return resultFor(proposal, 'patch export digest does not match the canonical draft')
    if (draft.patch.status === 'awaiting-confirmation' && Date.now() >= Date.parse(draft.patch.expiresAt)) {
      return updatePatchFailure(proposal, draft.patch, 'blocked', 'patch export window has expired')
    }
    if (draft.patch.status !== 'awaiting-confirmation' && draft.patch.status !== 'applied') {
      return resultFor(proposal, 'only an awaiting-confirmation or applied patch can be exported')
    }
    if (proposal.status !== 'confirmed' || !proposal.worktree) return resultFor(proposal, 'patch export requires the confirmed session-owned proposal worktree')
    const patchExport: ChangeProposalPatchExport = {
      patchId: draft.patch.patchId,
      proposalId: proposal.proposalId,
      confirmationDigest: draft.patch.confirmationDigest,
      patchText: draft.patchText,
      summary: clonePatchSummary(draft.patch.summary),
      sessionOnly: true,
      exportedAt: new Date().toISOString(),
    }
    return { ...resultFor(proposal, 'canonical patch exported in the current session only'), patchExport }
  }

  async confirmPatch(patchId: string, confirmationDigest: string, signal?: AbortSignal): Promise<ChangeProposalResult> {
    const draft = this.patches.get(patchId)
    if (!draft) return blockedResult('blocked', 'patch draft is unknown to the current session')
    const proposal = this.proposals.get(draft.proposalId)
    if (!proposal) return blockedResult('blocked', 'proposal for this patch draft is no longer available')
    if (draft.patch.status !== 'awaiting-confirmation') return resultFor(proposal, 'patch draft is no longer awaiting confirmation')
    if (signal?.aborted) return updatePatchFailure(proposal, draft.patch, 'interrupted', 'patch confirmation was interrupted before application')
    if (Date.now() >= Date.parse(draft.patch.expiresAt)) return updatePatchFailure(proposal, draft.patch, 'blocked', 'patch confirmation window has expired')
    if (!sameDigest(draft.patch.confirmationDigest, confirmationDigest)) return resultFor(proposal, 'patch confirmation digest does not match the pending draft')
    if (proposal.status !== 'confirmed' || !proposal.worktree) return updatePatchFailure(proposal, draft.patch, 'blocked', 'the proposal worktree is no longer available for patch application')

    let inspected: InspectedWorktree
    try {
      inspected = await this.adapter.inspect(proposal.repositoryRoot, proposal.worktree, signal)
    } catch (error) {
      return updatePatchFailure(proposal, draft.patch, signal?.aborted ? 'interrupted' : 'blocked', `live patch worktree inspection failed: ${redactError(error)}`)
    }
    if (inspected.identity !== proposal.worktree.identity) return updatePatchFailure(proposal, draft.patch, 'blocked', 'worktree identity no longer matches the session-owned worktree')
    if (inspected.baseRevision !== proposal.baseRevision) return updatePatchFailure(proposal, draft.patch, 'blocked', 'worktree base revision no longer matches the proposal')
    if (inspected.dirty || inspected.changedPaths.length > 0) return updatePatchFailure(proposal, draft.patch, 'blocked', 'patch application requires a clean worktree')

    try {
      await this.adapter.applyPatch(proposal.repositoryRoot, proposal.worktree, draft.patchText, workspaceRelativeRoot(proposal), signal)
    } catch (error) {
      const uncertain = error instanceof PatchApplicationError && error.uncertain
      draft.patch.status = signal?.aborted ? 'interrupted' : 'blocked'
      draft.patch.executionStatus = uncertain ? 'patch-application-unknown' : 'patch-not-applied'
      proposal.executionStatus.patch = draft.patch.executionStatus
      proposal.operationStatus = 'blocked'
      const reason = `isolated patch application failed${uncertain ? '; application result is unknown and the worktree was retained' : ''}: ${redactError(error)}`
      recordProposalEvent(proposal, 'patch', reason)
      return resultFor(proposal, reason)
    }

    let after: InspectedWorktree
    try {
      after = await this.adapter.inspect(proposal.repositoryRoot, proposal.worktree, signal)
    } catch (error) {
      return updatePatchFailure(proposal, draft.patch, signal?.aborted ? 'interrupted' : 'blocked', `patch postcondition inspection failed; application result is unknown and the worktree was retained: ${redactError(error)}`, 'patch-application-unknown')
    }
    const changedPaths = workspaceChangedPaths(proposal, after)
    const expectedPaths = new Set(draft.patch.summary.files.map((file) => file.relativePath))
    if (!changedPaths.length || changedPaths.some((changedPath) => !expectedPaths.has(changedPath))) {
      return updatePatchFailure(proposal, draft.patch, 'blocked', 'patch postcondition did not prove that only declared targets changed; the worktree was retained', 'patch-application-unknown')
    }
    draft.patch.status = 'applied'
    draft.patch.executionStatus = 'patch-applied'
    proposal.executionStatus.patch = 'patch-applied'
    proposal.operationStatus = 'patch-applied'
    proposal.patchApplied = true
    recordProposalEvent(proposal, 'patch', 'patch applied to the isolated worktree; commit and push were not performed')
    return resultFor(proposal, 'patch applied to the isolated worktree; commit and push were not performed')
  }

  rejectPatch(patchId: string): ChangeProposalResult {
    const draft = this.patches.get(patchId)
    if (!draft) return blockedResult('blocked', 'patch draft is unknown to the current session')
    const proposal = this.proposals.get(draft.proposalId)
    if (!proposal) return blockedResult('blocked', 'proposal for this patch draft is no longer available')
    if (draft.patch.status !== 'awaiting-confirmation') return resultFor(proposal, 'patch draft is no longer awaiting confirmation')
    draft.patch.status = 'rejected'
    proposal.operationStatus = 'patch-rejected'
    recordProposalEvent(proposal, 'patch', 'patch draft rejected; no files were modified')
    return resultFor(proposal, 'patch draft rejected; no files were modified')
  }

  async verifyPatch(
    request: ChangeProposalVerifyPatchRequest,
    runner: ChangeProposalVerificationRunner | undefined,
    execution?: ChangeProposalVerificationExecution,
    signal?: AbortSignal,
  ): Promise<ChangeProposalResult> {
    const draft = this.patches.get(request.patchId)
    if (!draft) return blockedResult('blocked', 'patch draft is unknown to the current session')
    const proposal = this.proposals.get(draft.proposalId)
    if (!proposal) return blockedResult('blocked', 'proposal for this patch draft is no longer available')
    if (draft.patch.verificationStatus !== 'not-run' && draft.patch.verification) return resultForWithVerification(proposal, 'patch verification already has a terminal result', draft.patch.verification)
    if (!sameDigest(draft.patch.confirmationDigest, request.confirmationDigest)) return resultFor(proposal, 'patch verification digest does not match the canonical draft')
    if (draft.patch.status !== 'applied' || proposal.status !== 'confirmed' || !proposal.worktree) return resultFor(proposal, 'patch verification requires an applied patch in a confirmed session-owned worktree')
    if (!runner) return recordVerification(proposal, draft.patch, unavailableVerification(request.recipeId, proposal.worktree.identity, 'patch verification runner is unavailable'))
    if (signal?.aborted) return recordVerification(proposal, draft.patch, unavailableVerification(request.recipeId, proposal.worktree.identity, 'patch verification was interrupted before execution', 'interrupted'))

    let before: InspectedWorktree
    try {
      before = await this.adapter.inspect(proposal.repositoryRoot, proposal.worktree, signal)
    } catch (error) {
      return recordVerification(proposal, draft.patch, unavailableVerification(request.recipeId, proposal.worktree.identity, `patch verification precondition inspection failed: ${redactError(error)}`, signal?.aborted ? 'interrupted' : 'blocked'))
    }
    const expectedPaths = new Set(draft.patch.summary.files.map((file) => file.relativePath))
    if (before.identity !== proposal.worktree.identity || before.baseRevision !== proposal.baseRevision || !before.dirty || !before.changedPaths.length || before.changedPaths.some((changedPath) => !expectedPaths.has(changedPath))) {
      return recordVerification(proposal, draft.patch, unavailableVerification(request.recipeId, proposal.worktree.identity, 'patch verification preconditions no longer match the applied patch', 'blocked'))
    }

    let verification: ChangeProposalVerification
    try {
      verification = await runner.run({ recipeId: request.recipeId, worktree: proposal.worktree, execution, signal })
    } catch (error) {
      verification = unavailableVerification(request.recipeId, proposal.worktree.identity, `patch verification runner failed closed: ${redactError(error)}`, signal?.aborted ? 'interrupted' : 'blocked')
    }
    verification = boundVerification(verification, this.limits.maxTextBytes)
    try {
      const after = await this.adapter.inspect(proposal.repositoryRoot, proposal.worktree, signal)
      if (after.identity !== proposal.worktree.identity || after.baseRevision !== proposal.baseRevision || after.changedPaths.some((changedPath) => !expectedPaths.has(changedPath)) || !samePathSet(before.changedPaths, after.changedPaths)) {
        verification = { ...verification, status: 'blocked', reason: 'verification postcondition found an identity, revision, or path change outside the applied patch' }
      }
    } catch (error) {
      verification = { ...verification, status: signal?.aborted ? 'interrupted' : 'blocked', reason: `patch verification postcondition is unknown; worktree was retained: ${redactError(error)}` }
    }
    return recordVerification(proposal, draft.patch, verification)
  }

  async prepareCommit(request: ChangeProposalCommitRequest, signal?: AbortSignal): Promise<ChangeProposalResult> {
    if (signal?.aborted) return blockedResult('interrupted', 'commit preparation was interrupted before validation')
    const proposal = this.proposals.get(request.proposalId)
    if (!proposal) return blockedResult('blocked', 'proposal is unknown to the current session')
    if (proposal.commit) return resultForWithCommit(proposal, 'this proposal already has a commit draft; terminal commit states are not replayable', proposal.commit)
    if (proposal.status !== 'confirmed' || !proposal.worktree) return resultFor(proposal, 'commit preparation requires a confirmed proposal with a managed worktree')
    if (!proposal.patch || proposal.patch.status !== 'applied' || proposal.patch.verificationStatus !== 'passed' || proposal.patch.verification?.status !== 'passed') {
      return resultFor(proposal, 'commit preparation requires an applied patch with passed verification')
    }

    let inspected: InspectedWorktree
    try {
      inspected = await this.adapter.inspect(proposal.repositoryRoot, proposal.worktree, signal)
    } catch (error) {
      return resultFor(proposal, `commit worktree inspection failed: ${redactError(error)}`)
    }
    const expectedPaths = proposal.patch.summary.files.map((file) => file.relativePath)
    if (inspected.identity !== proposal.worktree.identity) return resultFor(proposal, 'worktree identity no longer matches the session-owned worktree')
    if (inspected.baseRevision !== proposal.baseRevision) return resultFor(proposal, 'worktree base revision no longer matches the proposal')
    let changedPaths: string[]
    try {
      changedPaths = workspaceChangedPaths(proposal, inspected)
    } catch (error) {
      return resultFor(proposal, `commit worktree path mapping failed: ${redactError(error)}`)
    }
    if (!inspected.dirty || !samePathSet(changedPaths, expectedPaths)) return resultFor(proposal, 'commit preparation requires exactly the applied patch paths in the worktree')

    const message = normalizeCommitMessage(request.commitMessage, this.limits.maxTextBytes)
    if (!message.value) return resultFor(proposal, message.reason)
    try {
      repositoryRelativePaths(proposal)
    } catch (error) {
      return resultFor(proposal, `commit paths are outside the repository: ${redactError(error)}`)
    }

    const commit: ChangeProposalCommit = {
      commitId: `commit-${randomUUID()}`,
      confirmationDigest: '',
      status: 'awaiting-confirmation',
      message: message.value,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.limits.expirationMs).toISOString(),
      executionStatus: 'commit-not-created',
    }
    commit.confirmationDigest = createCommitDigest(proposal, commit, expectedPaths)
    proposal.commit = commit
    proposal.operationStatus = 'commit-awaiting-confirmation'
    this.commits.set(commit.commitId, { proposalId: proposal.proposalId, commit })
    recordProposalEvent(proposal, 'commit', 'commit draft prepared; exact commit digest and host approval are required before local commit')
    return resultForWithCommit(proposal, 'commit draft prepared; exact commit digest and host approval are required before local commit', commit)
  }

  async confirmCommit(
    commitId: string,
    confirmationDigest: string,
    authorizer: ChangeProposalCommitAuthorizer | undefined,
    execution?: ChangeProposalCommitExecution,
    signal?: AbortSignal,
  ): Promise<ChangeProposalResult> {
    const draft = this.commits.get(commitId)
    if (!draft) return blockedResult('blocked', 'commit draft is unknown to the current session')
    const proposal = this.proposals.get(draft.proposalId)
    if (!proposal) return blockedResult('blocked', 'proposal for this commit draft is no longer available')
    if (draft.commit.status !== 'awaiting-confirmation') return resultForWithCommit(proposal, 'commit draft is no longer awaiting confirmation', draft.commit)
    if (signal?.aborted) return updateCommitFailure(proposal, draft.commit, 'interrupted', 'commit confirmation was interrupted before approval', 'commit-not-created')
    if (Date.now() >= Date.parse(draft.commit.expiresAt)) return updateCommitFailure(proposal, draft.commit, 'blocked', 'commit confirmation window has expired', 'commit-not-created')
    if (!sameDigest(draft.commit.confirmationDigest, confirmationDigest)) return resultForWithCommit(proposal, 'commit confirmation digest does not match the pending draft', draft.commit)
    if (proposal.status !== 'confirmed' || !proposal.worktree || !proposal.patch || proposal.patch.status !== 'applied' || proposal.patch.verificationStatus !== 'passed' || proposal.patch.verification?.status !== 'passed') {
      return updateCommitFailure(proposal, draft.commit, 'blocked', 'commit requires a confirmed proposal with an applied, passed-verified patch', 'commit-not-created')
    }

    let inspected: InspectedWorktree
    try {
      inspected = await this.adapter.inspect(proposal.repositoryRoot, proposal.worktree, signal)
    } catch (error) {
      return updateCommitFailure(proposal, draft.commit, 'blocked', `live commit worktree inspection failed: ${redactError(error)}`, 'commit-not-created')
    }
    const expectedPaths = proposal.patch.summary.files.map((file) => file.relativePath)
    let changedPaths: string[]
    try {
      changedPaths = workspaceChangedPaths(proposal, inspected)
    } catch (error) {
      return updateCommitFailure(proposal, draft.commit, 'blocked', `commit worktree path mapping failed: ${redactError(error)}`, 'commit-not-created')
    }
    if (inspected.identity !== proposal.worktree.identity || inspected.baseRevision !== proposal.baseRevision || !inspected.dirty || !samePathSet(changedPaths, expectedPaths)) {
      return updateCommitFailure(proposal, draft.commit, 'blocked', 'commit preconditions no longer match the applied patch', 'commit-not-created')
    }
    let paths: string[]
    try {
      paths = repositoryRelativePaths(proposal)
    } catch (error) {
      return updateCommitFailure(proposal, draft.commit, 'blocked', `commit paths are outside the repository: ${redactError(error)}`, 'commit-not-created')
    }
    if (!authorizer) return updateCommitFailure(proposal, draft.commit, 'blocked', 'commit approval capability is unavailable', 'commit-not-created')

    let approval: ChangeProposalCommitApproval
    try {
      approval = await authorizer.authorize({
        commitId: draft.commit.commitId,
        confirmationDigest: draft.commit.confirmationDigest,
        commitMessage: draft.commit.message,
        worktree: proposal.worktree,
        execution,
        signal,
      })
    } catch (error) {
      return resultForWithCommit(proposal, `commit approval failed closed: ${redactError(error)}`, draft.commit)
    }
    if (!approval.allowed) return resultForWithCommit(proposal, approval.reason || 'commit approval was rejected; the draft remains awaiting confirmation', draft.commit)
    if (!approval.auditId) return updateCommitFailure(proposal, draft.commit, 'blocked', 'commit approval did not provide an audit id', 'commit-not-created')
    draft.commit.approvalAuditId = boundedRedactedText(approval.auditId, this.limits.maxTextBytes)

    let revision: string
    try {
      revision = await this.adapter.commit(proposal.repositoryRoot, proposal.worktree, paths, draft.commit.message, signal)
    } catch (error) {
      const uncertain = error instanceof CommitOperationError && error.uncertain
      return updateCommitFailure(
        proposal,
        draft.commit,
        signal?.aborted ? 'interrupted' : 'blocked',
        `isolated commit failed${uncertain ? '; commit result is unknown and the worktree was retained' : ''}: ${redactError(error)}`,
        uncertain ? 'commit-creation-unknown' : 'commit-not-created',
      )
    }

    let after: InspectedWorktree
    try {
      after = await this.adapter.inspect(proposal.repositoryRoot, proposal.worktree, signal)
    } catch (error) {
      return updateCommitFailure(proposal, draft.commit, signal?.aborted ? 'interrupted' : 'blocked', `commit postcondition inspection failed; result is unknown and the worktree was retained: ${redactError(error)}`, 'commit-creation-unknown')
    }
    if (after.identity !== proposal.worktree.identity || after.baseRevision !== revision || after.dirty || after.changedPaths.length > 0) {
      return updateCommitFailure(proposal, draft.commit, signal?.aborted ? 'interrupted' : 'blocked', 'commit postcondition did not prove a clean worktree at the returned revision; result is unknown and the worktree was retained', 'commit-creation-unknown')
    }
    draft.commit.status = 'created'
    draft.commit.executionStatus = 'commit-created'
    draft.commit.revision = revision
    proposal.executionStatus.commit = 'commit-created'
    proposal.operationStatus = 'commit-created'
    proposal.commitCreated = true
    recordProposalEvent(proposal, 'commit', 'local commit created in the isolated worktree; source workspace and remote were not modified')
    return resultForWithCommit(proposal, 'local commit created in the isolated worktree; source workspace and remote were not modified', draft.commit)
  }

  rejectCommit(commitId: string): ChangeProposalResult {
    const draft = this.commits.get(commitId)
    if (!draft) return blockedResult('blocked', 'commit draft is unknown to the current session')
    const proposal = this.proposals.get(draft.proposalId)
    if (!proposal) return blockedResult('blocked', 'proposal for this commit draft is no longer available')
    if (draft.commit.status !== 'awaiting-confirmation') return resultForWithCommit(proposal, 'commit draft is no longer awaiting confirmation', draft.commit)
    draft.commit.status = 'rejected'
    proposal.operationStatus = 'commit-rejected'
    recordProposalEvent(proposal, 'commit', 'commit draft rejected; no Git commit was created')
    return resultForWithCommit(proposal, 'commit draft rejected; no Git commit was created', draft.commit)
  }

  async prepareLanding(request: ChangeProposalLandingRequest, signal?: AbortSignal): Promise<ChangeProposalResult> {
    if (signal?.aborted) return blockedResult('interrupted', 'source landing preparation was interrupted before validation')
    const proposal = this.proposals.get(request.proposalId)
    if (!proposal) return blockedResult('blocked', 'proposal is unknown to the current session')
    if (proposal.landing) return resultForWithLanding(proposal, 'this proposal already has a source landing draft; terminal landing states are not replayable', proposal.landing)
    if (proposal.status !== 'confirmed' || !proposal.worktree) return resultFor(proposal, 'source landing requires a confirmed proposal with a managed worktree')
    if (!proposal.commit || proposal.commit.status !== 'created' || proposal.commit.executionStatus !== 'commit-created' || !proposal.commit.revision) {
      return resultFor(proposal, 'source landing requires a created local commit with a known revision')
    }
    if (!isSafeGitRevision(proposal.commit.revision)) return resultFor(proposal, 'source landing target revision is not a safe Git revision')

    let source: InspectedSourceWorktree
    try {
      source = await this.adapter.inspectSource(proposal.repositoryRoot, proposal.workspaceRoot, signal)
    } catch (error) {
      return resultFor(proposal, `source landing inspection failed: ${redactError(error)}`)
    }
    if (path.resolve(source.repositoryRoot) !== path.resolve(proposal.repositoryRoot)) return resultFor(proposal, 'source workspace repository root no longer matches the proposal')
    if (source.dirty) return resultFor(proposal, 'source landing requires a clean source workspace')
    if (source.revision !== proposal.baseRevision) return resultFor(proposal, 'source workspace HEAD no longer matches the proposal base revision')

    const landing: ChangeProposalLanding = {
      landingId: `landing-${randomUUID()}`,
      confirmationDigest: '',
      status: 'awaiting-confirmation',
      sourcePath: source.path,
      sourceRevision: proposal.baseRevision,
      commitRevision: proposal.commit.revision,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.limits.expirationMs).toISOString(),
      executionStatus: 'landing-not-performed',
    }
    landing.confirmationDigest = createLandingDigest(proposal, landing)
    proposal.landing = landing
    proposal.operationStatus = 'landing-awaiting-confirmation'
    this.landings.set(landing.landingId, { proposalId: proposal.proposalId, landing })
    recordProposalEvent(proposal, 'landing', 'source landing draft prepared; exact landing digest and host approval are required before source mutation')
    return resultForWithLanding(proposal, 'source landing draft prepared; exact landing digest and host approval are required before source mutation', landing)
  }

  async confirmLanding(
    landingId: string,
    confirmationDigest: string,
    authorizer: ChangeProposalLandingAuthorizer | undefined,
    execution?: ChangeProposalLandingExecution,
    signal?: AbortSignal,
  ): Promise<ChangeProposalResult> {
    const draft = this.landings.get(landingId)
    if (!draft) return blockedResult('blocked', 'source landing draft is unknown to the current session')
    const proposal = this.proposals.get(draft.proposalId)
    if (!proposal) return blockedResult('blocked', 'proposal for this source landing draft is no longer available')
    if (draft.landing.status !== 'awaiting-confirmation') return resultForWithLanding(proposal, 'source landing draft is no longer awaiting confirmation', draft.landing)
    if (signal?.aborted) return updateLandingFailure(proposal, draft.landing, 'interrupted', 'source landing confirmation was interrupted before approval', 'landing-not-performed')
    if (Date.now() >= Date.parse(draft.landing.expiresAt)) return updateLandingFailure(proposal, draft.landing, 'blocked', 'source landing confirmation window has expired', 'landing-not-performed')
    if (!sameDigest(draft.landing.confirmationDigest, confirmationDigest)) return resultForWithLanding(proposal, 'source landing confirmation digest does not match the pending draft', draft.landing)
    if (proposal.status !== 'confirmed' || !proposal.worktree || !proposal.commit || proposal.commit.status !== 'created' || proposal.commit.executionStatus !== 'commit-created' || proposal.commit.revision !== draft.landing.commitRevision) {
      return updateLandingFailure(proposal, draft.landing, 'blocked', 'source landing requires the unchanged confirmed proposal and created commit', 'landing-not-performed')
    }

    let source: InspectedSourceWorktree
    try {
      source = await this.adapter.inspectSource(proposal.repositoryRoot, proposal.workspaceRoot, signal)
    } catch (error) {
      return updateLandingFailure(proposal, draft.landing, 'blocked', `live source landing inspection failed: ${redactError(error)}`, 'landing-not-performed')
    }
    if (path.resolve(source.repositoryRoot) !== path.resolve(proposal.repositoryRoot) || path.resolve(source.path) !== path.resolve(draft.landing.sourcePath) || source.revision !== draft.landing.sourceRevision || source.dirty) {
      return updateLandingFailure(proposal, draft.landing, 'blocked', 'source landing preconditions no longer match the clean exact-base source workspace', 'landing-not-performed')
    }
    if (!authorizer) return updateLandingFailure(proposal, draft.landing, 'blocked', 'source landing approval capability is unavailable', 'landing-not-performed')

    let approval: ChangeProposalLandingApproval
    try {
      approval = await authorizer.authorize({
        landingId: draft.landing.landingId,
        confirmationDigest: draft.landing.confirmationDigest,
        sourcePath: draft.landing.sourcePath,
        commitRevision: draft.landing.commitRevision,
        execution,
        signal,
      })
    } catch (error) {
      return resultForWithLanding(proposal, `source landing approval failed closed: ${redactError(error)}`, draft.landing)
    }
    if (!approval.allowed) return resultForWithLanding(proposal, approval.reason || 'source landing approval was rejected; the draft remains awaiting confirmation', draft.landing)
    if (!approval.auditId) return updateLandingFailure(proposal, draft.landing, 'blocked', 'source landing approval did not provide an audit id', 'landing-not-performed')
    draft.landing.approvalAuditId = boundedRedactedText(approval.auditId, this.limits.maxTextBytes)

    let landedRevision: string
    try {
      landedRevision = await this.adapter.land(proposal.repositoryRoot, proposal.workspaceRoot, draft.landing.sourceRevision, draft.landing.commitRevision, signal)
    } catch (error) {
      const uncertain = error instanceof LandingOperationError && error.uncertain
      return updateLandingFailure(
        proposal,
        draft.landing,
        signal?.aborted ? 'interrupted' : 'blocked',
        `source fast-forward landing failed${uncertain ? '; landing result is unknown and source/worktree were retained' : ''}: ${redactError(error)}`,
        uncertain ? 'landing-creation-unknown' : 'landing-not-performed',
      )
    }

    let after: InspectedSourceWorktree
    try {
      after = await this.adapter.inspectSource(proposal.repositoryRoot, proposal.workspaceRoot, signal)
    } catch (error) {
      return updateLandingFailure(proposal, draft.landing, signal?.aborted ? 'interrupted' : 'blocked', `source landing postcondition inspection failed; result is unknown and source/worktree were retained: ${redactError(error)}`, 'landing-creation-unknown')
    }
    if (path.resolve(after.repositoryRoot) !== path.resolve(proposal.repositoryRoot) || path.resolve(after.path) !== path.resolve(draft.landing.sourcePath) || after.revision !== draft.landing.commitRevision || landedRevision !== draft.landing.commitRevision || after.dirty) {
      return updateLandingFailure(proposal, draft.landing, signal?.aborted ? 'interrupted' : 'blocked', 'source landing postcondition did not prove the target revision and clean source workspace; result is unknown and source/worktree were retained', 'landing-creation-unknown')
    }
    draft.landing.status = 'landed'
    draft.landing.executionStatus = 'landing-completed'
    draft.landing.landedRevision = landedRevision
    proposal.executionStatus.landing = 'landing-completed'
    proposal.operationStatus = 'landing-completed'
    proposal.sourceLanded = true
    recordProposalEvent(proposal, 'landing', 'source workspace fast-forward landed the isolated commit; remote and push were not performed')
    return resultForWithLanding(proposal, 'source workspace fast-forward landed the isolated commit; remote and push were not performed', draft.landing)
  }

  rejectLanding(landingId: string): ChangeProposalResult {
    const draft = this.landings.get(landingId)
    if (!draft) return blockedResult('blocked', 'source landing draft is unknown to the current session')
    const proposal = this.proposals.get(draft.proposalId)
    if (!proposal) return blockedResult('blocked', 'proposal for this source landing draft is no longer available')
    if (draft.landing.status !== 'awaiting-confirmation') return resultForWithLanding(proposal, 'source landing draft is no longer awaiting confirmation', draft.landing)
    draft.landing.status = 'rejected'
    proposal.operationStatus = 'landing-rejected'
    recordProposalEvent(proposal, 'landing', 'source landing draft rejected; source workspace was not modified')
    return resultForWithLanding(proposal, 'source landing draft rejected; source workspace was not modified', draft.landing)
  }

  reject(proposalId: string): ChangeProposalResult {
    const proposal = this.proposals.get(proposalId)
    if (!proposal) return blockedResult('blocked', 'proposal is unknown to the current session')
    if (proposal.status !== 'awaiting-confirmation') return resultFor(proposal, 'proposal is no longer awaiting confirmation')
    proposal.status = 'rejected'
    proposal.operationStatus = 'blocked'
    recordProposalEvent(proposal, 'proposal', 'proposal rejected; no worktree was created')
    return resultFor(proposal, 'proposal rejected; no worktree was created')
  }

  async release(proposalId: string, signal?: AbortSignal): Promise<ChangeProposalResult> {
    const proposal = this.proposals.get(proposalId)
    if (!proposal) return blockedResult('blocked', 'proposal is unknown to the current session')
    if (proposal.status !== 'confirmed' || !proposal.worktree) return resultFor(proposal, 'only a confirmed proposal with a managed worktree can be released')
    if (signal?.aborted) return mutateStatus(proposal, 'interrupted', 'blocked', 'worktree release was interrupted', 'release')
    try {
      const inspected = await this.adapter.inspect(proposal.repositoryRoot, proposal.worktree, signal)
      if (inspected.identity !== proposal.worktree.identity) return mutateStatus(proposal, 'blocked', 'blocked', 'worktree identity no longer matches the session-owned worktree', 'release')
      if (inspected.dirty) return mutateStatus(proposal, 'blocked', 'blocked', 'worktree has uncommitted changes; refusing force removal', 'release')
      await this.adapter.remove(proposal.repositoryRoot, proposal.worktree, signal)
      proposal.status = 'released'
      proposal.operationStatus = 'released'
      recordProposalEvent(proposal, 'release', 'session-owned clean worktree released')
      return resultFor(proposal, 'session-owned clean worktree released')
    } catch (error) {
      return mutateStatus(proposal, signal?.aborted ? 'interrupted' : 'blocked', 'blocked', `worktree release failed: ${redactError(error)}`, 'release')
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
          identity: worktreeIdentity(canonicalTarget),
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
      if (!record) throw new Error('managed worktree is not present at the expected path')
      const status = await runGit(['-C', worktree.path, 'status', '--porcelain', '--untracked-files=all'], worktree.path, signal)
      const trackedChanges = await runGit(['-C', worktree.path, 'diff', '--name-only', '--no-ext-diff'], worktree.path, signal)
      const stagedChanges = await runGit(['-C', worktree.path, 'diff', '--cached', '--name-only', '--no-ext-diff'], worktree.path, signal)
      const untrackedChanges = await runGit(['-C', worktree.path, 'ls-files', '--others', '--exclude-standard'], worktree.path, signal)
      return {
        path: canonicalTarget,
        identity: worktreeIdentity(canonicalTarget),
        baseRevision: record.baseRevision,
        dirty: status.length > 0,
        changedPaths: uniquePaths([...trackedChanges.split('\n'), ...stagedChanges.split('\n'), ...untrackedChanges.split('\n')]),
      }
    },
    async inspectSource(repositoryRoot, sourceWorkspaceRoot, signal) {
      const canonicalWorkspace = await fs.realpath(path.resolve(sourceWorkspaceRoot))
      const discoveredRoot = path.resolve(await runGit(['-C', canonicalWorkspace, 'rev-parse', '--show-toplevel'], canonicalWorkspace, signal))
      if (path.resolve(repositoryRoot) !== discoveredRoot) throw new Error('source workspace repository root does not match the proposal repository')
      const revision = await runGit(['-C', canonicalWorkspace, 'rev-parse', '--verify', 'HEAD^{commit}'], canonicalWorkspace, signal)
      const status = await runGit(['-C', canonicalWorkspace, 'status', '--porcelain', '--untracked-files=all'], canonicalWorkspace, signal)
      return { path: canonicalWorkspace, repositoryRoot: discoveredRoot, revision, dirty: status.length > 0 }
    },
    async applyPatch(_repositoryRoot, worktree, patchText, workspaceRelativeRoot, signal) {
      const patchCwd = path.resolve(worktree.path, workspaceRelativeRoot || '.')
      if (!isWithin(worktree.path, patchCwd)) throw new Error('patch working directory is outside the managed worktree')
      await runGitWithInput(['-C', patchCwd, 'apply', '--check', '--whitespace=error'], patchCwd, patchText, signal)
      try {
        await runGitWithInput(['-C', patchCwd, 'apply', '--whitespace=error'], patchCwd, patchText, signal)
      } catch (error) {
        throw new PatchApplicationError(redactError(error), true)
      }
    },
    async commit(_repositoryRoot, worktree, repositoryRelativePaths, commitMessage, signal) {
      const paths = uniquePaths(repositoryRelativePaths)
      if (paths.length === 0 || paths.some((value) => !isSafeRepositoryRelativePath(value))) {
        throw new CommitOperationError('commit paths are empty or outside the repository', false)
      }
      try {
        await runGit(['-C', worktree.path, 'add', '--', ...paths], worktree.path, signal)
        const staged = uniquePaths((await runGit(['-C', worktree.path, 'diff', '--cached', '--name-only', '--no-ext-diff'], worktree.path, signal)).split('\n'))
        if (!samePathSet(staged, paths)) throw new Error('staged path set does not exactly match the declared commit paths')
      } catch (error) {
        throw new CommitOperationError(`commit staging failed: ${redactError(error)}`, false)
      }
      try {
        await runGit(['-C', worktree.path, '-c', 'commit.gpgSign=false', 'commit', '--no-verify', '--no-gpg-sign', '-m', commitMessage], worktree.path, signal)
        return await runGit(['-C', worktree.path, 'rev-parse', '--verify', 'HEAD^{commit}'], worktree.path, signal)
      } catch (error) {
        throw new CommitOperationError(`local commit result is unknown: ${redactError(error)}`, true)
      }
    },
    async land(repositoryRoot, sourceWorkspaceRoot, expectedSourceRevision, commitRevision, signal) {
      if (!isSafeGitRevision(expectedSourceRevision) || !isSafeGitRevision(commitRevision)) throw new LandingOperationError('source or target revision is not a safe Git revision', false)
      let inspected: InspectedSourceWorktree
      try {
        inspected = await this.inspectSource(repositoryRoot, sourceWorkspaceRoot, signal)
      } catch (error) {
        throw new LandingOperationError(`source landing precondition inspection failed: ${redactError(error)}`, false)
      }
      if (inspected.revision !== expectedSourceRevision || inspected.dirty) throw new LandingOperationError('source workspace is not clean at the expected base revision', false)
      try {
        const resolvedTarget = await runGit(['-C', inspected.path, 'rev-parse', '--verify', `${commitRevision}^{commit}`], inspected.path, signal)
        if (resolvedTarget !== commitRevision) throw new Error('target commit revision could not be resolved exactly')
      } catch (error) {
        throw new LandingOperationError(`target commit is not locally resolvable: ${redactError(error)}`, false)
      }
      try {
        await runGit(['-C', inspected.path, 'merge', '--ff-only', '--no-verify', '--no-edit', commitRevision], inspected.path, signal)
      } catch (error) {
        throw new LandingOperationError(`source fast-forward landing failed: ${redactError(error)}`, isUncertainGitFailure(error, signal))
      }
      try {
        return await runGit(['-C', inspected.path, 'rev-parse', '--verify', 'HEAD^{commit}'], inspected.path, signal)
      } catch (error) {
        throw new LandingOperationError(`source landing result is unknown: ${redactError(error)}`, true)
      }
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

function isSafeGitRevision(value: string): boolean {
  return /^[a-f0-9]{40,64}$/.test(value)
}

function isUncertainGitFailure(error: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) return true
  if (!error || typeof error !== 'object') return true
  const candidate = error as { code?: unknown; killed?: unknown; signal?: unknown; name?: unknown }
  return candidate.name === 'AbortError' || candidate.code === 'ETIMEDOUT' || candidate.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' || candidate.killed === true || typeof candidate.signal === 'string'
}

function worktreeIdentity(worktreePath: string): string {
  return createHash('sha256').update(path.resolve(worktreePath)).digest('hex').slice(0, 32)
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

function runGitWithInput(args: readonly string[], cwd: string, input: string, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Git operation was interrupted'))
      return
    }
    const child = spawn('git', [...args], {
      cwd,
      shell: false,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let settled = false
    const finish = (callback: () => void): void => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      signal?.removeEventListener('abort', onAbort)
      callback()
    }
    const onAbort = (): void => {
      child.kill('SIGTERM')
      finish(() => reject(new Error('Git operation was interrupted')))
    }
    const timeout = setTimeout(() => {
      child.kill('SIGTERM')
      finish(() => reject(new Error('Git operation timed out')))
    }, 15_000)
    child.stdout.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString()
      if (Buffer.byteLength(stdout) > 128 * 1024) {
        child.kill('SIGTERM')
        finish(() => reject(new Error('Git output exceeded the bounded limit')))
      }
    })
    child.stderr.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString()
      if (Buffer.byteLength(stderr) > 128 * 1024) {
        child.kill('SIGTERM')
        finish(() => reject(new Error('Git error output exceeded the bounded limit')))
      }
    })
    child.on('error', (error) => finish(() => reject(error)))
    child.on('close', (code, signalName) => {
      finish(() => {
        if (code === 0) {
          resolve(stdout.trim())
          return
        }
        reject(new Error(stderr.trim() || `Git exited with ${signalName ?? `code ${code ?? 'unknown'}`}`))
      })
    })
    signal?.addEventListener('abort', onAbort, { once: true })
    child.stdin.end(input)
  })
}

function validatePatch(
  patchText: string,
  proposal: ChangeProposal,
  session: AnalysisSession,
  config: RepoAtlasConfig,
  limits: ChangeProposalLimits,
): { parsed: ParsedPatch } | { parsed?: undefined; reason: string } {
  if (typeof patchText !== 'string' || !patchText.trim()) return { reason: 'patch text is required' }
  const canonicalText = patchText.replaceAll('\r\n', '\n').replaceAll('\r', '\n')
  if (canonicalText.includes('\0')) return { reason: 'patch text contains a NUL byte' }
  const normalizedText = canonicalText.endsWith('\n') ? canonicalText : `${canonicalText}\n`
  if (Buffer.byteLength(normalizedText) > limits.maxPatchBytes) return { reason: 'patch byte budget exhausted' }
  const secretCheck = redactSecretLike(normalizedText)
  if (secretCheck.redacted) return { reason: 'patch text contains secret-like content and was rejected' }
  const parsed = parsePatchText(normalizedText, limits)
  if (!parsed.parsed) return parsed

  const targetMap = new Map(proposal.targets.filter((target) => target.status === 'confirmed').map((target) => [target.relativePath, target]))
  for (const file of parsed.parsed.summary.files) {
    const check = checkWorkspacePath(proposal.workspaceRoot, file.relativePath)
    if (!check.allowed) return { reason: `${file.relativePath}: ${check.reason}` }
    if (isSensitivePath(file.relativePath, config.sensitiveFilePatterns)) return { reason: `${file.relativePath}: sensitive path is not eligible for patch application` }
    if (config.excludeDirs.includes(file.relativePath.split('/')[0] ?? '')) return { reason: `${file.relativePath}: excluded directory is not eligible for patch application` }
    if (!isPathCoveredByScope(file.relativePath, session.goal.scope)) return { reason: `${file.relativePath}: outside the confirmed GoalSpec scope` }
    const target = targetMap.get(file.relativePath)
    if (!target || target.operation !== file.operation) return { reason: `${file.relativePath}: patch operation is not covered by the confirmed proposal target` }
  }
  return parsed
}

function parsePatchText(patchText: string, limits: ChangeProposalLimits): { parsed: ParsedPatch } | { parsed?: undefined; reason: string } {
  const lines = patchText.slice(-1) === '\n' ? patchText.slice(0, -1).split('\n') : patchText.split('\n')
  if (!lines.length || !lines[0]?.startsWith('diff --git ')) return { reason: 'patch must start with a supported diff --git header' }
  for (const line of lines) {
    if (Buffer.byteLength(line) > limits.maxPatchLineBytes) return { reason: 'patch line-length budget exhausted' }
  }
  const starts = lines.flatMap((line, index) => line.startsWith('diff --git ') ? [index] : [])
  if (starts.length === 0 || starts[0] !== 0) return { reason: 'patch contains unsupported content before the first diff block' }
  if (starts.length > limits.maxPatchFiles) return { reason: 'patch file budget exhausted' }

  const files: ChangeProposalPatchFileSummary[] = []
  let totalHunks = 0
  for (let blockIndex = 0; blockIndex < starts.length; blockIndex += 1) {
    const start = starts[blockIndex] ?? 0
    const end = starts[blockIndex + 1] ?? lines.length
    const block = lines.slice(start, end)
    const header = /^diff --git a\/(.+) b\/(.+)$/.exec(block[0] ?? '')
    if (!header || header[1] !== header[2]) return { reason: 'patch contains unsupported rename, copy, or quoted diff header' }
    if (block.some((line) => /^(?:Binary files|GIT binary patch|rename from |rename to |copy from |copy to |similarity index |old mode |new mode |Subproject commit )/.test(line))) {
      return { reason: 'patch contains unsupported binary, rename, mode, or submodule metadata' }
    }
    const oldHeader = block.find((line) => line.startsWith('--- '))
    const newHeader = block.find((line) => line.startsWith('+++ '))
    const oldPath = parsePatchPath(oldHeader, '--- ', 'a/')
    const newPath = parsePatchPath(newHeader, '+++ ', 'b/')
    if (oldPath === undefined || newPath === undefined || (oldPath === null && newPath === null)) return { reason: 'patch has invalid unified-diff file headers' }
    const relativePath = oldPath ?? newPath
    if (relativePath !== header[1]) return { reason: 'patch diff header and unified file header do not match' }
    const operation: ChangeProposalOperation = oldPath === null ? 'add' : newPath === null ? 'delete' : 'modify'
    if (block.some((line) => line.startsWith('new file mode ')) && operation !== 'add') return { reason: 'new file metadata does not match patch operation' }
    if (block.some((line) => line.startsWith('deleted file mode ')) && operation !== 'delete') return { reason: 'deleted file metadata does not match patch operation' }

    let hunks = 0
    let additions = 0
    let deletions = 0
    let inHunk = false
    for (const line of block.slice(Math.max(block.indexOf(newHeader ?? ''), 0) + 1)) {
      if (line.startsWith('@@ ')) {
        if (!/^@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@(?: .*)?$/.test(line)) return { reason: 'patch contains an invalid hunk header' }
        hunks += 1
        totalHunks += 1
        if (totalHunks > limits.maxPatchHunks) return { reason: 'patch hunk budget exhausted' }
        inHunk = true
        continue
      }
      if (!inHunk) {
        if (line.startsWith('index ') || line.startsWith('new file mode ') || line.startsWith('deleted file mode ')) continue
        return { reason: 'patch contains unsupported metadata' }
      }
      if (line === '\\ No newline at end of file') continue
      if (line.startsWith('+')) additions += 1
      else if (line.startsWith('-')) deletions += 1
      else if (line.startsWith(' ')) continue
      else return { reason: 'patch contains an unsupported hunk line' }
    }
    if (hunks === 0) return { reason: 'patch file has no hunks' }
    files.push({ relativePath, operation, additions, deletions, hunks })
  }
  const duplicate = files.find((file, index) => files.findIndex((candidate) => candidate.relativePath === file.relativePath) !== index)
  if (duplicate) return { reason: `patch contains a duplicate target: ${duplicate.relativePath}` }
  return {
    parsed: {
      canonicalText: patchText,
      summary: {
        bytes: Buffer.byteLength(patchText),
        files,
        hunks: totalHunks,
        changedLines: files.reduce((total, file) => total + file.additions + file.deletions, 0),
      },
    },
  }
}

function parsePatchPath(line: string | undefined, marker: string, prefix: string): string | null | undefined {
  if (!line?.startsWith(marker)) return undefined
  const value = line.slice(marker.length).split('\t', 1)[0] ?? ''
  if (value === '/dev/null') return null
  if (!value.startsWith(prefix) || value.length <= prefix.length) return undefined
  return value.slice(prefix.length)
}

function createPatchDigest(proposal: ChangeProposal, patch: ChangeProposalPatch, patchText: string): string {
  const payload = JSON.stringify({
    patchId: patch.patchId,
    proposalId: proposal.proposalId,
    proposalDigest: proposal.confirmationDigest,
    baseRevision: proposal.baseRevision,
    worktreeIdentity: proposal.worktree?.identity,
    summary: patch.summary,
    patchText,
  })
  return createHash('sha256').update(payload).digest('hex')
}

function createCommitDigest(proposal: ChangeProposal, commit: ChangeProposalCommit, expectedWorkspacePaths: readonly string[]): string {
  const payload = JSON.stringify({
    commitId: commit.commitId,
    proposalId: proposal.proposalId,
    patchId: proposal.patch?.patchId,
    patchDigest: proposal.patch?.confirmationDigest,
    verificationId: proposal.patch?.verification?.verificationId,
    verificationStatus: proposal.patch?.verification?.status,
    baseRevision: proposal.baseRevision,
    worktreeIdentity: proposal.worktree?.identity,
    expectedWorkspacePaths: [...expectedWorkspacePaths].sort(),
    commitMessage: commit.message,
  })
  return createHash('sha256').update(payload).digest('hex')
}

function createLandingDigest(proposal: ChangeProposal, landing: ChangeProposalLanding): string {
  const payload = JSON.stringify({
    landingId: landing.landingId,
    proposalId: proposal.proposalId,
    commitId: proposal.commit?.commitId,
    commitDigest: proposal.commit?.confirmationDigest,
    commitRevision: landing.commitRevision,
    sourcePath: path.resolve(landing.sourcePath),
    sourceRevision: landing.sourceRevision,
  })
  return createHash('sha256').update(payload).digest('hex')
}

function updatePatchFailure(
  proposal: ChangeProposal,
  patch: ChangeProposalPatch,
  status: 'blocked' | 'interrupted',
  reason: string,
  executionStatus: ChangeProposalPatch['executionStatus'] = 'patch-not-applied',
): ChangeProposalResult {
  patch.status = status
  patch.executionStatus = executionStatus
  proposal.executionStatus.patch = executionStatus
  proposal.operationStatus = 'blocked'
  recordProposalEvent(proposal, 'patch', reason)
  return resultFor(proposal, reason)
}

function updateCommitFailure(
  proposal: ChangeProposal,
  commit: ChangeProposalCommit,
  status: 'blocked' | 'interrupted',
  reason: string,
  executionStatus: ChangeProposalCommitExecutionStatus,
): ChangeProposalResult {
  commit.status = status
  commit.executionStatus = executionStatus
  proposal.executionStatus.commit = executionStatus
  proposal.operationStatus = status === 'interrupted' ? 'commit-interrupted' : 'commit-blocked'
  recordProposalEvent(proposal, 'commit', reason)
  return resultForWithCommit(proposal, reason, commit)
}

function updateLandingFailure(
  proposal: ChangeProposal,
  landing: ChangeProposalLanding,
  status: 'blocked' | 'interrupted',
  reason: string,
  executionStatus: ChangeProposalLandingExecutionStatus,
): ChangeProposalResult {
  landing.status = status
  landing.executionStatus = executionStatus
  proposal.executionStatus.landing = executionStatus
  proposal.operationStatus = status === 'interrupted' ? 'landing-interrupted' : executionStatus === 'landing-creation-unknown' ? 'landing-creation-unknown' : 'landing-blocked'
  recordProposalEvent(proposal, 'landing', reason)
  return resultForWithLanding(proposal, reason, landing)
}

function recordVerification(
  proposal: ChangeProposal,
  patch: ChangeProposalPatch,
  verification: ChangeProposalVerification,
): ChangeProposalResult {
  patch.verificationStatus = verification.status
  patch.verification = verification
  proposal.operationStatus = verificationOperationStatus(verification.status)
  recordProposalEvent(proposal, 'verification', verification.reason)
  return resultForWithVerification(proposal, verification.reason, verification)
}

function resultForWithVerification(proposal: ChangeProposal, reason: string, verification: ChangeProposalVerification): ChangeProposalResult {
  return { ...resultFor(proposal, reason), verification: { ...verification } }
}

function resultForWithCommit(proposal: ChangeProposal, reason: string, commit: ChangeProposalCommit): ChangeProposalResult {
  return { ...resultFor(proposal, reason), commit: { ...commit } }
}

function resultForWithLanding(proposal: ChangeProposal, reason: string, landing: ChangeProposalLanding): ChangeProposalResult {
  return { ...resultFor(proposal, reason), landing: { ...landing } }
}

function resultForWithLive(proposal: ChangeProposal, reason: string, liveInspection: ChangeProposalLiveInspection): ChangeProposalResult {
  return { ...resultFor(proposal, reason), liveInspection }
}

function createLiveInspection(
  source: ChangeProposalLiveSourceObservation,
  worktree: ChangeProposalLiveWorktreeObservation,
  maxTextBytes = 4_096,
): ChangeProposalLiveInspection {
  const statuses = [source.status, worktree.status].filter((status) => status !== 'not-applicable')
  const available = statuses.filter((status) => status === 'available').length
  const unknown = statuses.filter((status) => status === 'unknown').length
  const status: ChangeProposalLiveInspection['status'] = statuses.length === 0
    ? 'not-applicable'
    : unknown === 0
      ? 'available'
      : available > 0
        ? 'partial'
        : 'unknown'
  const details = [source.reason, worktree.reason].filter((reason) => reason.length > 0).join('; ')
  return {
    status,
    reason: boundedRedactedText(`live observation ${status}; ${details}`, maxTextBytes),
    checkedAt: new Date().toISOString(),
    sessionOnly: true,
    source,
    worktree,
  }
}

function interruptedLiveInspection(proposal: ChangeProposal, maxTextBytes: number): ChangeProposalLiveInspection {
  const source: ChangeProposalLiveSourceObservation = {
    status: 'unknown',
    reason: boundedRedactedText('source workspace inspection was interrupted before adapter access', maxTextBytes),
  }
  const worktree: ChangeProposalLiveWorktreeObservation = proposal.worktree
    ? { status: 'unknown', reason: boundedRedactedText('managed worktree inspection was interrupted before adapter access', maxTextBytes) }
    : { status: 'not-applicable', reason: 'proposal has no managed worktree to inspect' }
  return createLiveInspection(source, worktree, maxTextBytes)
}

function verificationOperationStatus(status: ChangeProposalVerification['status']): ChangeProposal['operationStatus'] {
  if (status === 'passed') return 'patch-verification-passed'
  if (status === 'interrupted' || status === 'cancelled') return 'patch-verification-interrupted'
  if (status === 'failed' || status === 'timed-out') return 'patch-verification-failed'
  return 'patch-verification-blocked'
}

function unavailableVerification(
  recipeId: string,
  worktreeIdentity: string,
  reason: string,
  status: ChangeProposalVerification['status'] = 'blocked',
): ChangeProposalVerification {
  return {
    verificationId: `verification-${randomUUID()}`,
    auditId: `verification-${randomUUID()}`,
    recipeId,
    status,
    reason,
    worktreeIdentity,
    stdout: '',
    stderr: '',
    outputTruncated: false,
    redacted: false,
    redactedMatchCount: 0,
    createdAt: new Date().toISOString(),
  }
}

function normalizeProposalListLimit(value: number | undefined): number | undefined {
  const limit = value === undefined ? DEFAULT_CHANGE_PROPOSAL_LIST_LIMIT : value
  return Number.isSafeInteger(limit) && limit > 0 && limit <= MAX_CHANGE_PROPOSAL_LIST_LIMIT ? limit : undefined
}

function compareProposalCreation(left: ChangeProposal, right: ChangeProposal): number {
  return right.createdAt.localeCompare(left.createdAt) || right.proposalId.localeCompare(left.proposalId)
}

function proposalSummary(proposal: ChangeProposal): ChangeProposalSummary {
  return {
    proposalId: proposal.proposalId,
    intent: proposal.intent,
    status: proposal.status,
    operationStatus: proposal.operationStatus,
    targetCount: proposal.targets.length,
    confirmedTargetCount: proposal.targets.filter((target) => target.status === 'confirmed').length,
    createdAt: proposal.createdAt,
    expiresAt: proposal.expiresAt,
    executionStatus: { ...proposal.executionStatus },
    patchApplied: proposal.patchApplied,
    commitCreated: proposal.commitCreated,
    sourceLanded: proposal.sourceLanded,
    pushPerformed: false,
    patch: proposal.patch ? {
      patchId: proposal.patch.patchId,
      status: proposal.patch.status,
      executionStatus: proposal.patch.executionStatus,
      verificationStatus: proposal.patch.verificationStatus,
    } : undefined,
    commit: proposal.commit ? {
      commitId: proposal.commit.commitId,
      status: proposal.commit.status,
      executionStatus: proposal.commit.executionStatus,
      revision: proposal.commit.revision,
    } : undefined,
    landing: proposal.landing ? {
      landingId: proposal.landing.landingId,
      status: proposal.landing.status,
      executionStatus: proposal.landing.executionStatus,
      landedRevision: proposal.landing.landedRevision,
    } : undefined,
  }
}

function samePathSet(left: readonly string[], right: readonly string[]): boolean {
  return [...new Set(left)].sort().join('\0') === [...new Set(right)].sort().join('\0')
}

function clonePatchSummary(summary: ChangeProposalPatchSummary): ChangeProposalPatchSummary {
  return {
    ...summary,
    files: summary.files.map((file) => ({ ...file })),
  }
}

function boundVerification(verification: ChangeProposalVerification, maxBytes: number): ChangeProposalVerification {
  return {
    ...verification,
    reason: boundedRedactedText(verification.reason, maxBytes),
    stdout: boundedRedactedText(verification.stdout, maxBytes),
    stderr: boundedRedactedText(verification.stderr, maxBytes),
  }
}

function workspaceRelativeRoot(proposal: ChangeProposal): string {
  const relative = path.relative(path.resolve(proposal.repositoryRoot), path.resolve(proposal.workspaceRoot))
  if (path.isAbsolute(relative) || relative === '..' || relative.startsWith(`..${path.sep}`)) throw new Error('proposal workspace is outside the repository root')
  return relative
}

function workspaceChangedPaths(proposal: ChangeProposal, inspected: InspectedWorktree): string[] {
  const relativeRoot = workspaceRelativeRoot(proposal)
  const worktreeWorkspace = path.resolve(inspected.path, relativeRoot || '.')
  const result: string[] = []
  for (const repositoryPath of inspected.changedPaths) {
    const absolute = path.resolve(inspected.path, repositoryPath)
    if (!isWithin(worktreeWorkspace, absolute)) return [repositoryPath]
    result.push(path.relative(worktreeWorkspace, absolute).replaceAll(path.sep, '/'))
  }
  return uniquePaths(result)
}

function repositoryRelativePaths(proposal: ChangeProposal): string[] {
  if (!proposal.patch) throw new Error('proposal has no patch')
  const repositoryRoot = path.resolve(proposal.repositoryRoot)
  const workspaceRoot = path.resolve(proposal.workspaceRoot)
  const paths = proposal.patch.summary.files.map((file) => {
    const absolute = path.resolve(workspaceRoot, file.relativePath)
    if (!isWithin(workspaceRoot, absolute) || !isWithin(repositoryRoot, absolute) || absolute === repositoryRoot) throw new Error(`invalid repository path: ${file.relativePath}`)
    const relative = path.relative(repositoryRoot, absolute).replaceAll(path.sep, '/')
    if (!isSafeRepositoryRelativePath(relative)) throw new Error(`invalid repository path: ${file.relativePath}`)
    return relative
  })
  return uniquePaths(paths)
}

function uniquePaths(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0).map((value) => value.replaceAll('\\', '/')))]
}

function isSafeRepositoryRelativePath(value: string): boolean {
  return value.length > 0 && value !== '.' && !value.startsWith('/') && value !== '..' && !value.startsWith('../') && !value.includes('\0')
}

function normalizeCommitMessage(value: unknown, maxBytes: number): { value?: string; reason: string } {
  if (typeof value !== 'string' || !value.trim()) return { reason: 'a non-empty commit message is required' }
  const message = value.replaceAll('\r\n', '\n').replaceAll('\r', '\n').trim()
  if (message.includes('\0')) return { reason: 'commit message contains a NUL byte' }
  if (Buffer.byteLength(message) > maxBytes) return { reason: 'commit message byte budget exhausted' }
  if (redactSecretLike(message).redacted) return { reason: 'commit message contains secret-like content and was rejected' }
  return { value: message, reason: 'commit message is valid' }
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

function blockedProposalList(reason: string): ChangeProposalListResult {
  return {
    status: 'blocked',
    reason,
    proposals: [],
    total: 0,
    returned: 0,
    truncated: false,
    sessionOnly: true,
  }
}

function blockedProposalHistory(reason: string): ChangeProposalHistoryResult {
  return {
    status: 'blocked',
    reason,
    events: [],
    total: 0,
    returned: 0,
    truncated: false,
    sessionOnly: true,
  }
}

function blockedProposalRecovery(reason: string): ChangeProposalRecoveryResult {
  return {
    status: 'blocked',
    reason,
    sessionOnly: true,
  }
}

function recoveryDecision(proposal: ChangeProposal): {
  recommendation: ChangeProposalRecoveryRecommendation
  allowedActions: ChangeProposalRecoveryAction[]
  manualReviewRequired: boolean
  reason: string
} {
  if (proposal.status === 'rejected' || proposal.status === 'released') {
    return { recommendation: 'no-action', allowedActions: [], manualReviewRequired: false, reason: 'proposal is in a terminal session state with no automatic continuation' }
  }
  if (requiresManualRecoveryReview(proposal)) {
    return {
      recommendation: 'manual-review-required',
      allowedActions: [],
      manualReviewRequired: true,
      reason: `proposal state ${proposal.operationStatus} is blocked, interrupted, uncertain, or not safe for automatic continuation`,
    }
  }
  if (proposal.status === 'awaiting-confirmation') {
    return { recommendation: 'confirm', allowedActions: ['confirm', 'reject'], manualReviewRequired: false, reason: 'proposal is awaiting the explicit confirmation digest' }
  }
  if (proposal.status !== 'confirmed') {
    return { recommendation: 'manual-review-required', allowedActions: [], manualReviewRequired: true, reason: 'proposal status is not a safe continuation state' }
  }
  if (!proposal.patch) {
    return { recommendation: 'prepare-patch', allowedActions: ['prepare-patch', 'release'], manualReviewRequired: false, reason: 'confirmed proposal has no patch draft; prepare a bounded patch or release the clean worktree' }
  }
  if (proposal.patch.status === 'awaiting-confirmation') {
    return { recommendation: 'confirm-patch', allowedActions: ['confirm-patch', 'reject-patch', 'release'], manualReviewRequired: false, reason: 'patch draft is awaiting its exact confirmation digest' }
  }
  if (proposal.patch.status === 'rejected') {
    return { recommendation: 'release', allowedActions: ['release'], manualReviewRequired: false, reason: 'patch draft was rejected and the proposal worktree can only be safely released' }
  }
  if (proposal.patch.status !== 'applied') {
    return { recommendation: 'manual-review-required', allowedActions: [], manualReviewRequired: true, reason: 'patch state does not prove a safe continuation' }
  }
  if (proposal.patch.verificationStatus === 'not-run') {
    return { recommendation: 'verify-patch', allowedActions: ['verify-patch'], manualReviewRequired: false, reason: 'applied patch has not yet recorded a verification result' }
  }
  if (proposal.patch.verificationStatus !== 'passed') {
    return { recommendation: 'manual-review-required', allowedActions: [], manualReviewRequired: true, reason: 'patch verification did not prove a safe continuation' }
  }
  if (!proposal.commit) {
    return { recommendation: 'prepare-commit', allowedActions: ['prepare-commit'], manualReviewRequired: false, reason: 'patch verification passed and a commit draft can be prepared' }
  }
  if (proposal.commit.status === 'awaiting-confirmation') {
    return { recommendation: 'confirm-commit', allowedActions: ['confirm-commit', 'reject-commit'], manualReviewRequired: false, reason: 'commit draft is awaiting its exact digest and host approval' }
  }
  if (proposal.commit.status !== 'created') {
    return { recommendation: 'manual-review-required', allowedActions: [], manualReviewRequired: true, reason: 'commit state does not prove a safe continuation' }
  }
  if (!proposal.landing) {
    return { recommendation: 'prepare-landing', allowedActions: ['prepare-landing', 'release'], manualReviewRequired: false, reason: 'local commit is known and source landing can be prepared or the clean worktree can be released' }
  }
  if (proposal.landing.status === 'awaiting-confirmation') {
    return { recommendation: 'confirm-landing', allowedActions: ['confirm-landing', 'reject-landing'], manualReviewRequired: false, reason: 'source landing draft is awaiting its exact digest and host approval' }
  }
  if (proposal.landing.status === 'landed' || proposal.landing.status === 'rejected') {
    return { recommendation: 'release', allowedActions: ['release'], manualReviewRequired: false, reason: 'source landing is terminal and the session-owned clean worktree can be released' }
  }
  return { recommendation: 'manual-review-required', allowedActions: [], manualReviewRequired: true, reason: 'landing state does not prove a safe continuation' }
}

function requiresManualRecoveryReview(proposal: ChangeProposal): boolean {
  if (proposal.status === 'blocked' || proposal.status === 'interrupted') return true
  if (proposal.executionStatus.patch === 'patch-application-unknown' || proposal.executionStatus.commit === 'commit-creation-unknown' || proposal.executionStatus.landing === 'landing-creation-unknown') return true
  if (proposal.patch && (proposal.patch.status === 'blocked' || proposal.patch.status === 'interrupted' || proposal.patch.verificationStatus === 'failed' || proposal.patch.verificationStatus === 'blocked' || proposal.patch.verificationStatus === 'interrupted' || proposal.patch.verificationStatus === 'denied' || proposal.patch.verificationStatus === 'sandbox-unavailable' || proposal.patch.verificationStatus === 'timed-out' || proposal.patch.verificationStatus === 'cancelled')) return true
  if (proposal.commit && (proposal.commit.status === 'blocked' || proposal.commit.status === 'interrupted')) return true
  if (proposal.landing && (proposal.landing.status === 'blocked' || proposal.landing.status === 'interrupted')) return true
  return false
}

function mutateStatus(
  proposal: ChangeProposal,
  status: ChangeProposal['status'],
  operationStatus: ChangeProposal['operationStatus'],
  reason: string,
  phase: ChangeProposalEventPhase = 'proposal',
): ChangeProposalResult {
  proposal.status = status
  proposal.operationStatus = operationStatus
  recordProposalEvent(proposal, phase, reason)
  return resultFor(proposal, reason)
}

function blockedResult(status: Extract<ChangeProposal['status'], 'blocked' | 'interrupted'>, reason: string): ChangeProposalResult {
  return { status, operationStatus: 'blocked', reason }
}

function recordProposalEvent(proposal: ChangeProposal, phase: ChangeProposalEventPhase, reason: string): void {
  proposalEventRecorders.get(proposal)?.(phase, reason)
}

function cloneProposalEvent(event: ChangeProposalEvent): ChangeProposalEvent {
  return {
    ...event,
    executionStatus: { ...event.executionStatus },
  }
}

function cloneProposal(proposal: ChangeProposal): ChangeProposal {
  return {
    ...proposal,
    targets: proposal.targets.map((target) => ({ ...target })),
    evidenceIds: [...proposal.evidenceIds],
    limitations: [...proposal.limitations],
    risks: [...proposal.risks],
    worktree: proposal.worktree ? { ...proposal.worktree } : undefined,
    commit: proposal.commit ? { ...proposal.commit } : undefined,
    landing: proposal.landing ? { ...proposal.landing } : undefined,
    patch: proposal.patch ? {
      ...proposal.patch,
      limitations: [...proposal.patch.limitations],
      summary: clonePatchSummary(proposal.patch.summary),
      verification: proposal.patch.verification ? { ...proposal.patch.verification } : undefined,
    } : undefined,
  }
}

function isProposalOperation(value: unknown): value is ChangeProposalOperation {
  return value === 'add' || value === 'modify' || value === 'delete'
}

function redactError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.replaceAll(/(?:api[_-]?key|token|password|secret)\s*[:=]\s*\S+/gi, '[REDACTED_SECRET]').slice(0, 400)
}
