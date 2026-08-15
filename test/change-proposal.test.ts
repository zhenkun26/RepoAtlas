import test from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { ChangeProposalManager, createNodeGitWorktreeAdapter, type ChangeProposalVerificationRunner, type GitWorktreeAdapter } from '../src/repository/change-proposal.ts'
import { createConfig } from '../src/config.ts'
import { createEvidence } from '../src/evidence.ts'
import type { AnalysisSession, ChangeProposalRequest, ChangeProposalResult, ChangeProposalVerification, ChangeProposalWorktree } from '../src/types.ts'

const execFileAsync = promisify(execFile)
const fixtureRoot = path.resolve('test/fixtures/complete-repo')

class FakeGitAdapter implements GitWorktreeAdapter {
  createCount = 0
  removeCount = 0
  applyPatchCount = 0
  commitCount = 0
  landCount = 0
  commitRevision = 'a'.repeat(40)
  sourceRevision = 'base-1'
  sourceDirty = false
  dirty = false
  changedPaths: string[] = []
  failDiscovery = false
  failPatch = false
  failCommit = false
  failLanding = false
  failLandingPostcondition = false
  failCommitPostcondition = false
  failPostcondition = false
  identityMismatch = false

  async discover(workspaceRoot: string): Promise<{ repositoryRoot: string; baseRevision: string }> {
    if (this.failDiscovery) throw new Error('git unavailable')
    return { repositoryRoot: workspaceRoot, baseRevision: 'base-1' }
  }

  async create(_repositoryRoot: string, baseRevision: string): Promise<ChangeProposalWorktree> {
    this.createCount += 1
    return { path: path.join(os.tmpdir(), 'repo-atlas-fake-worktree'), identity: `identity-${this.createCount}`, baseRevision }
  }

  async inspect(_repositoryRoot: string, worktree: ChangeProposalWorktree): Promise<ChangeProposalWorktree & { dirty: boolean; changedPaths: string[] }> {
    if ((this.failPostcondition && this.applyPatchCount > 0) || (this.failCommitPostcondition && this.commitCount > 0)) throw new Error('postcondition inspection unavailable')
    return { ...worktree, baseRevision: this.commitCount > 0 ? this.commitRevision : worktree.baseRevision, identity: this.identityMismatch ? 'identity-mismatch' : worktree.identity, dirty: this.dirty, changedPaths: [...this.changedPaths] }
  }

  async inspectSource(repositoryRoot: string, sourceWorkspaceRoot: string): Promise<{ path: string; repositoryRoot: string; revision: string; dirty: boolean }> {
    if (this.failLandingPostcondition && this.landCount > 0) throw new Error('source postcondition inspection unavailable')
    return { path: sourceWorkspaceRoot, repositoryRoot, revision: this.sourceRevision, dirty: this.sourceDirty }
  }

  async applyPatch(): Promise<void> {
    this.applyPatchCount += 1
    if (this.failPatch) throw new Error('patch rejected by fake Git')
    this.dirty = true
    this.changedPaths = ['src/index.ts']
  }

  async commit(): Promise<string> {
    this.commitCount += 1
    if (this.failCommit) throw new Error('commit rejected by fake Git')
    this.dirty = false
    this.changedPaths = []
    return this.commitRevision
  }

  async land(_repositoryRoot: string, _sourceWorkspaceRoot: string, _expectedSourceRevision: string, commitRevision: string): Promise<string> {
    this.landCount += 1
    if (this.failLanding) throw new Error('landing rejected by fake Git')
    this.sourceRevision = commitRevision
    return this.sourceRevision
  }

  async remove(): Promise<void> {
    this.removeCount += 1
  }
}

function createSession(scope: string[] = ['src']): AnalysisSession {
  return {
    sessionId: 'session-proposal-test',
    workspaceRoot: fixtureRoot,
    goal: {
      intent: 'custom',
      audience: 'reviewer',
      scope,
      outputs: ['proposal'],
      permissions: ['read'],
      success_criteria: ['bounded proposal'],
      confirmed: true,
    },
    plan: { name: 'onboarding', steps: [] },
    scan: { files: [], skipped: [], failures: [], audits: [], budget: { candidateFiles: 0, readBytes: 0, actions: 0, exhausted: false } },
    evidence: [createEvidence('src/index.ts', '全文（已脱敏）', 'export const entry = true', 'confirmed', true)],
    conclusions: [],
    actions: [],
    edges: [],
    ast: [],
    project: {
      name: 'fixture',
      summary: 'fixture',
      techStack: [],
      entries: [],
      coreDirectories: [],
      runtimeConfig: [],
      testConfig: [],
      readingOrder: [],
    },
    interrupted: false,
  }
}

function request(overrides: Partial<ChangeProposalRequest> = {}): ChangeProposalRequest {
  return {
    sessionId: 'session-proposal-test',
    intent: '调整入口结构',
    targets: [{ relativePath: 'src/index.ts', operation: 'modify', rationale: '保持入口职责清晰' }],
    evidenceIds: [],
    ...overrides,
  }
}

function validPatch(replacement = 'new'): string {
  return `diff --git a/src/index.ts b/src/index.ts
--- a/src/index.ts
+++ b/src/index.ts
@@ -1 +1 @@
-old
+${replacement}
`
}

async function prepareVerifiedCommitDraft(manager: ChangeProposalManager, runner: ChangeProposalVerificationRunner, recipeId: string): Promise<ChangeProposalResult> {
  const pending = await manager.prepare(request())
  const confirmed = await manager.confirm(pending.proposal?.proposalId ?? '', pending.proposal?.confirmationDigest ?? '')
  const patchDraft = await manager.preparePatch({ proposalId: confirmed.proposal?.proposalId ?? '', patchText: validPatch() })
  const applied = await manager.confirmPatch(patchDraft.proposal?.patch?.patchId ?? '', patchDraft.proposal?.patch?.confirmationDigest ?? '')
  const verified = await manager.verifyPatch({ patchId: applied.proposal?.patch?.patchId ?? '', confirmationDigest: applied.proposal?.patch?.confirmationDigest ?? '', recipeId }, runner)
  return manager.prepareCommit({ proposalId: verified.proposal?.proposalId ?? '', commitMessage: `feat: ${recipeId}` })
}

async function prepareCreatedCommit(manager: ChangeProposalManager, runner: ChangeProposalVerificationRunner, recipeId: string): Promise<ChangeProposalResult> {
  const draft = await prepareVerifiedCommitDraft(manager, runner, recipeId)
  return manager.confirmCommit(draft.proposal?.commit?.commitId ?? '', draft.proposal?.commit?.confirmationDigest ?? '', {
    authorize: async () => ({ allowed: true, auditId: `approval-${recipeId}`, reason: 'approved' }),
  })
}

function passedVerificationRunner(): ChangeProposalVerificationRunner {
  return {
    async run({ recipeId, worktree }): Promise<ChangeProposalVerification> {
      return {
        verificationId: `verification-${recipeId}`,
        auditId: `audit-${recipeId}`,
        recipeId,
        status: 'passed',
        reason: 'verification passed',
        worktreeIdentity: worktree.identity,
        stdout: 'ok',
        stderr: '',
        outputTruncated: false,
        redacted: false,
        redactedMatchCount: 0,
        exitCode: 0,
        signal: null,
        createdAt: new Date().toISOString(),
      }
    },
  }
}

test('proposal lifecycle requires exact confirmation and releases a clean owned worktree', async () => {
  const adapter = new FakeGitAdapter()
  const manager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter })
  manager.registerSession(createSession())

  const pending = await manager.prepare(request())
  assert.equal(pending.status, 'awaiting-confirmation')
  assert.equal(pending.operationStatus, 'proposal')
  assert.equal(adapter.createCount, 0)
  assert.ok(pending.proposal)

  const mismatch = await manager.confirm(pending.proposal?.proposalId ?? '', '0'.repeat(64))
  assert.equal(mismatch.status, 'awaiting-confirmation')
  assert.equal(adapter.createCount, 0)

  const confirmed = await manager.confirm(pending.proposal?.proposalId ?? '', pending.proposal?.confirmationDigest ?? '')
  assert.equal(confirmed.status, 'confirmed')
  assert.equal(confirmed.operationStatus, 'worktree-created')
  assert.equal(confirmed.proposal?.patchApplied, false)
  assert.equal(confirmed.proposal?.commitCreated, false)
  assert.equal(confirmed.proposal?.pushPerformed, false)
  assert.deepEqual(confirmed.proposal?.executionStatus, {
    patch: 'patch-not-applied',
    commit: 'commit-not-created',
    landing: 'landing-not-performed',
    push: 'push-not-performed',
  })
  assert.equal(adapter.createCount, 1)

  const replay = await manager.confirm(pending.proposal?.proposalId ?? '', pending.proposal?.confirmationDigest ?? '')
  assert.equal(replay.status, 'confirmed')
  assert.equal(adapter.createCount, 1)

  const released = await manager.release(pending.proposal?.proposalId ?? '')
  assert.equal(released.status, 'released')
  assert.equal(released.operationStatus, 'released')
  assert.equal(adapter.removeCount, 1)
})

test('proposal validation preserves safe partial targets and bounded evidence', async () => {
  const manager = new ChangeProposalManager(createConfig(fixtureRoot), {
    adapter: new FakeGitAdapter(),
    limits: { maxTargets: 4, maxEvidenceIds: 1, maxTextBytes: 512 },
  })
  manager.registerSession(createSession(['src']))
  const result = await manager.prepare(request({
    intent: '变更'.repeat(400),
    targets: [
      { relativePath: 'src/index.ts', operation: 'modify' },
      { relativePath: '../outside.ts', operation: 'modify' },
      { relativePath: '.env', operation: 'modify' },
      { relativePath: 'README.md', operation: 'modify' },
      { relativePath: 'src/server.ts', operation: 'modify' },
    ],
    evidenceIds: ['missing', 'also-missing'],
  }))
  assert.equal(result.status, 'awaiting-confirmation')
  assert.equal(result.proposal?.targets.filter((target) => target.status === 'confirmed').length, 1)
  assert.ok(result.proposal?.targets.some((target) => target.reason?.includes('outside')))
  assert.ok(result.proposal?.targets.some((target) => target.reason?.includes('outside the confirmed GoalSpec scope')))
  assert.ok(result.proposal?.targets.some((target) => target.reason?.includes('sensitive path')))
  assert.ok(result.proposal?.limitations.some((item) => item.includes('budget exhausted')))
  assert.ok(result.proposal?.limitations.some((item) => item.includes('evidence id')))
  assert.ok((result.proposal?.intent.length ?? 0) <= 512)

  const sensitiveManager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter: new FakeGitAdapter() })
  sensitiveManager.registerSession(createSession(['.']))
  const sensitive = await sensitiveManager.prepare(request({ targets: [{ relativePath: '.env', operation: 'modify' }] }))
  assert.equal(sensitive.status, 'blocked')
  assert.match(sensitive.reason, /sensitive|eligible/)
})

test('proposal fails closed for missing session, abort, Git failure, and dirty release', async () => {
  const adapter = new FakeGitAdapter()
  const manager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter })
  const missing = await manager.prepare(request({ sessionId: 'unknown' }))
  assert.equal(missing.status, 'blocked')

  const aborted = new AbortController()
  aborted.abort()
  const interrupted = await manager.prepare(request(), aborted.signal)
  assert.equal(interrupted.status, 'interrupted')

  adapter.failDiscovery = true
  manager.registerSession(createSession())
  const failed = await manager.prepare(request())
  assert.equal(failed.status, 'blocked')
  adapter.failDiscovery = false

  const pending = await manager.prepare(request())
  const confirmed = await manager.confirm(pending.proposal?.proposalId ?? '', pending.proposal?.confirmationDigest ?? '')
  assert.equal(confirmed.status, 'confirmed')
  adapter.dirty = true
  const dirty = await manager.release(pending.proposal?.proposalId ?? '')
  assert.equal(dirty.status, 'blocked')
  assert.equal(adapter.removeCount, 0)
})

test('proposal confirmation expires and cannot be replayed after rejection', async () => {
  const adapter = new FakeGitAdapter()
  const manager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter, limits: { expirationMs: 1 } })
  manager.registerSession(createSession())
  const pending = await manager.prepare(request())
  assert.ok(pending.proposal)
  await new Promise((resolve) => setTimeout(resolve, 5))
  const expired = await manager.confirm(pending.proposal?.proposalId ?? '', pending.proposal?.confirmationDigest ?? '')
  assert.equal(expired.status, 'blocked')
  assert.equal(adapter.createCount, 0)

  const second = await manager.prepare(request())
  const rejected = manager.reject(second.proposal?.proposalId ?? '')
  assert.equal(rejected.status, 'rejected')
  const replay = await manager.confirm(second.proposal?.proposalId ?? '', second.proposal?.confirmationDigest ?? '')
  assert.equal(replay.status, 'rejected')
  assert.equal(adapter.createCount, 0)
})

test('patch lifecycle requires a second exact digest and retains applied dirty worktrees', async () => {
  const adapter = new FakeGitAdapter()
  const manager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter })
  manager.registerSession(createSession())
  const pending = await manager.prepare(request())
  const confirmed = await manager.confirm(pending.proposal?.proposalId ?? '', pending.proposal?.confirmationDigest ?? '')
  const draft = await manager.preparePatch({ proposalId: confirmed.proposal?.proposalId ?? '', patchText: validPatch() })

  assert.equal(draft.status, 'confirmed')
  assert.equal(draft.operationStatus, 'patch-awaiting-confirmation')
  assert.equal(draft.proposal?.patch?.status, 'awaiting-confirmation')
  assert.equal(adapter.applyPatchCount, 0)

  const mismatch = await manager.confirmPatch(draft.proposal?.patch?.patchId ?? '', '0'.repeat(64))
  assert.equal(mismatch.proposal?.patch?.status, 'awaiting-confirmation')
  assert.equal(adapter.applyPatchCount, 0)

  const applied = await manager.confirmPatch(draft.proposal?.patch?.patchId ?? '', draft.proposal?.patch?.confirmationDigest ?? '')
  assert.equal(applied.status, 'confirmed')
  assert.equal(applied.operationStatus, 'patch-applied')
  assert.equal(applied.proposal?.patch?.status, 'applied')
  assert.equal(applied.proposal?.patchApplied, true)
  assert.equal(applied.proposal?.executionStatus.patch, 'patch-applied')
  assert.equal(applied.proposal?.commitCreated, false)
  assert.equal(applied.proposal?.pushPerformed, false)
  assert.equal(adapter.applyPatchCount, 1)

  const replay = await manager.confirmPatch(draft.proposal?.patch?.patchId ?? '', draft.proposal?.patch?.confirmationDigest ?? '')
  assert.equal(replay.proposal?.patch?.status, 'applied')
  assert.equal(adapter.applyPatchCount, 1)

  const release = await manager.release(draft.proposal?.proposalId ?? '')
  assert.equal(release.status, 'blocked')
  assert.equal(adapter.removeCount, 0)
})

test('patch review and export require the exact digest without mutating the worktree', async () => {
  const adapter = new FakeGitAdapter()
  const manager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter })
  manager.registerSession(createSession())
  const pending = await manager.prepare(request())
  const confirmed = await manager.confirm(pending.proposal?.proposalId ?? '', pending.proposal?.confirmationDigest ?? '')
  const draft = await manager.preparePatch({ proposalId: confirmed.proposal?.proposalId ?? '', patchText: validPatch('exported') })
  const patchId = draft.proposal?.patch?.patchId ?? ''
  const digest = draft.proposal?.patch?.confirmationDigest ?? ''

  const reviewed = manager.reviewPatch(patchId)
  assert.equal(reviewed.proposal?.patch?.status, 'awaiting-confirmation')
  assert.equal(adapter.applyPatchCount, 0)

  const mismatch = manager.exportPatch(patchId, '0'.repeat(64))
  assert.equal(mismatch.patchExport, undefined)
  assert.equal(mismatch.proposal?.patch?.status, 'awaiting-confirmation')
  assert.equal(adapter.applyPatchCount, 0)

  const exported = manager.exportPatch(patchId, digest)
  assert.equal(exported.patchExport?.sessionOnly, true)
  assert.equal(exported.patchExport?.patchText, validPatch('exported'))
  assert.equal(exported.patchExport?.confirmationDigest, digest)
  assert.equal(exported.proposal?.patch?.status, 'awaiting-confirmation')
  assert.equal(exported.proposal?.executionStatus.patch, 'patch-not-applied')
  assert.equal(exported.proposal?.commitCreated, false)
  assert.equal(exported.proposal?.pushPerformed, false)
  assert.equal(adapter.applyPatchCount, 0)
})

test('patch verification is digest-bound, read-only at the manager boundary, and non-replayable', async () => {
  const adapter = new FakeGitAdapter()
  let runnerCalls = 0
  const runner: ChangeProposalVerificationRunner = {
    async run({ recipeId, worktree }): Promise<ChangeProposalVerification> {
      runnerCalls += 1
      return {
        verificationId: `verification-${runnerCalls}`,
        auditId: `audit-${runnerCalls}`,
        recipeId,
        status: 'passed',
        reason: 'verification completed successfully',
        worktreeIdentity: worktree.identity,
        stdout: 'ok',
        stderr: '',
        outputTruncated: false,
        redacted: false,
        redactedMatchCount: 0,
        exitCode: 0,
        signal: null,
        createdAt: new Date().toISOString(),
      }
    },
  }
  const manager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter })
  manager.registerSession(createSession())
  const pending = await manager.prepare(request())
  const confirmed = await manager.confirm(pending.proposal?.proposalId ?? '', pending.proposal?.confirmationDigest ?? '')
  const draft = await manager.preparePatch({ proposalId: confirmed.proposal?.proposalId ?? '', patchText: validPatch() })
  const applied = await manager.confirmPatch(draft.proposal?.patch?.patchId ?? '', draft.proposal?.patch?.confirmationDigest ?? '')
  const verifyRequest = {
    patchId: applied.proposal?.patch?.patchId ?? '',
    confirmationDigest: applied.proposal?.patch?.confirmationDigest ?? '',
    recipeId: 'test',
  }

  const mismatch = await manager.verifyPatch({ ...verifyRequest, confirmationDigest: '0'.repeat(64) }, runner)
  assert.equal(mismatch.proposal?.patch?.verificationStatus, 'not-run')
  assert.equal(runnerCalls, 0)

  const verified = await manager.verifyPatch(verifyRequest, runner)
  assert.equal(verified.operationStatus, 'patch-verification-passed')
  assert.equal(verified.proposal?.patch?.verificationStatus, 'passed')
  assert.equal(verified.proposal?.executionStatus.patch, 'patch-applied')
  assert.equal(verified.proposal?.commitCreated, false)
  assert.equal(verified.proposal?.pushPerformed, false)
  assert.equal(verified.verification?.stdout, 'ok')
  assert.equal(runnerCalls, 1)

  const replay = await manager.verifyPatch(verifyRequest, runner)
  assert.equal(replay.operationStatus, 'patch-verification-passed')
  assert.equal(runnerCalls, 1)
})

test('isolated commit lifecycle requires passed verification, exact digest, approval, and clean postcondition', async () => {
  const adapter = new FakeGitAdapter()
  let verificationCalls = 0
  const runner: ChangeProposalVerificationRunner = {
    async run({ recipeId, worktree }): Promise<ChangeProposalVerification> {
      verificationCalls += 1
      return {
        verificationId: `verification-commit-${verificationCalls}`,
        auditId: `audit-commit-${verificationCalls}`,
        recipeId,
        status: 'passed',
        reason: 'verification passed',
        worktreeIdentity: worktree.identity,
        stdout: 'ok',
        stderr: '',
        outputTruncated: false,
        redacted: false,
        redactedMatchCount: 0,
        exitCode: 0,
        signal: null,
        createdAt: new Date().toISOString(),
      }
    },
  }
  const authorizer = {
    authorize: async () => ({ allowed: true, auditId: 'commit-approval-1', reason: 'approved' }),
  }
  const manager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter })
  manager.registerSession(createSession())
  const pending = await manager.prepare(request())
  const confirmed = await manager.confirm(pending.proposal?.proposalId ?? '', pending.proposal?.confirmationDigest ?? '')
  const patchDraft = await manager.preparePatch({ proposalId: confirmed.proposal?.proposalId ?? '', patchText: validPatch() })
  const applied = await manager.confirmPatch(patchDraft.proposal?.patch?.patchId ?? '', patchDraft.proposal?.patch?.confirmationDigest ?? '')
  const verified = await manager.verifyPatch({
    patchId: applied.proposal?.patch?.patchId ?? '',
    confirmationDigest: applied.proposal?.patch?.confirmationDigest ?? '',
    recipeId: 'commit-test',
  }, runner)
  const secretMessage = await manager.prepareCommit({ proposalId: verified.proposal?.proposalId ?? '', commitMessage: 'token=not-a-commit-message' })
  assert.equal(secretMessage.proposal?.commit, undefined)
  const oversizedMessage = await manager.prepareCommit({ proposalId: verified.proposal?.proposalId ?? '', commitMessage: 'x'.repeat(5_000) })
  assert.equal(oversizedMessage.proposal?.commit, undefined)
  const draft = await manager.prepareCommit({ proposalId: verified.proposal?.proposalId ?? '', commitMessage: 'feat: isolated change' })

  assert.equal(draft.proposal?.commit?.status, 'awaiting-confirmation')
  assert.equal(draft.proposal?.executionStatus.commit, 'commit-not-created')
  assert.equal(draft.commit?.confirmationDigest, draft.proposal?.commit?.confirmationDigest)
  assert.equal(adapter.commitCount, 0)

  const mismatch = await manager.confirmCommit(draft.proposal?.commit?.commitId ?? '', '0'.repeat(64), authorizer)
  assert.equal(mismatch.proposal?.commit?.status, 'awaiting-confirmation')
  assert.equal(adapter.commitCount, 0)

  const created = await manager.confirmCommit(
    draft.proposal?.commit?.commitId ?? '',
    draft.proposal?.commit?.confirmationDigest ?? '',
    authorizer,
    { callId: 'commit-call', agent: { session: { header: { cwd: fixtureRoot } } } },
  )
  assert.equal(created.status, 'confirmed')
  assert.equal(created.operationStatus, 'commit-created')
  assert.equal(created.proposal?.commit?.status, 'created')
  assert.equal(created.proposal?.commit?.executionStatus, 'commit-created')
  assert.equal(created.proposal?.commit?.approvalAuditId, 'commit-approval-1')
  assert.equal(created.proposal?.commit?.revision, adapter.commitRevision)
  assert.equal(created.proposal?.commitCreated, true)
  assert.equal(created.proposal?.executionStatus.commit, 'commit-created')
  assert.equal(created.proposal?.executionStatus.push, 'push-not-performed')
  assert.equal(adapter.commitCount, 1)

  const replay = await manager.confirmCommit(draft.proposal?.commit?.commitId ?? '', draft.proposal?.commit?.confirmationDigest ?? '', authorizer)
  assert.equal(replay.proposal?.commit?.status, 'created')
  assert.equal(adapter.commitCount, 1)
  const released = await manager.release(draft.proposal?.proposalId ?? '')
  assert.equal(released.status, 'released')
  assert.equal(adapter.removeCount, 1)
})

test('isolated commit blocks unverified, rejected, expired, failed, and uncertain states without cleanup', async () => {
  const unavailableAdapter = new FakeGitAdapter()
  const unavailableManager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter: unavailableAdapter })
  unavailableManager.registerSession(createSession())
  const unavailablePending = await unavailableManager.prepare(request())
  const unavailableConfirmed = await unavailableManager.confirm(unavailablePending.proposal?.proposalId ?? '', unavailablePending.proposal?.confirmationDigest ?? '')
  const unavailable = await unavailableManager.prepareCommit({ proposalId: unavailableConfirmed.proposal?.proposalId ?? '', commitMessage: 'feat: not verified' })
  assert.equal(unavailable.proposal?.commit, undefined)
  assert.match(unavailable.reason, /passed verification/)

  const runner: ChangeProposalVerificationRunner = {
    async run({ recipeId, worktree }): Promise<ChangeProposalVerification> {
      return {
        verificationId: 'verification-failure',
        auditId: 'audit-failure',
        recipeId,
        status: 'failed',
        reason: 'verification failed',
        worktreeIdentity: worktree.identity,
        stdout: '',
        stderr: 'failed',
        outputTruncated: false,
        redacted: false,
        redactedMatchCount: 0,
        createdAt: new Date().toISOString(),
      }
    },
  }
  const rejectedAdapter = new FakeGitAdapter()
  const rejectedManager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter: rejectedAdapter })
  rejectedManager.registerSession(createSession())
  const rejectedPending = await rejectedManager.prepare(request())
  const rejectedConfirmed = await rejectedManager.confirm(rejectedPending.proposal?.proposalId ?? '', rejectedPending.proposal?.confirmationDigest ?? '')
  const rejectedPatch = await rejectedManager.preparePatch({ proposalId: rejectedConfirmed.proposal?.proposalId ?? '', patchText: validPatch() })
  const rejectedApplied = await rejectedManager.confirmPatch(rejectedPatch.proposal?.patch?.patchId ?? '', rejectedPatch.proposal?.patch?.confirmationDigest ?? '')
  const rejectedVerified = await rejectedManager.verifyPatch({ patchId: rejectedApplied.proposal?.patch?.patchId ?? '', confirmationDigest: rejectedApplied.proposal?.patch?.confirmationDigest ?? '', recipeId: 'failure' }, runner)
  assert.equal(rejectedVerified.proposal?.patch?.verificationStatus, 'failed')
  assert.equal((await rejectedManager.prepareCommit({ proposalId: rejectedVerified.proposal?.proposalId ?? '', commitMessage: 'feat: rejected' })).proposal?.commit, undefined)

  const happyRunner: ChangeProposalVerificationRunner = {
    async run({ recipeId, worktree }): Promise<ChangeProposalVerification> {
      return {
        verificationId: `verification-${recipeId}`,
        auditId: `audit-${recipeId}`,
        recipeId,
        status: 'passed',
        reason: 'verification passed',
        worktreeIdentity: worktree.identity,
        stdout: 'ok',
        stderr: '',
        outputTruncated: false,
        redacted: false,
        redactedMatchCount: 0,
        exitCode: 0,
        signal: null,
        createdAt: new Date().toISOString(),
      }
    },
  }
  const abortedAdapter = new FakeGitAdapter()
  const abortedManager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter: abortedAdapter })
  abortedManager.registerSession(createSession())
  const abortedDraft = await prepareVerifiedCommitDraft(abortedManager, happyRunner, 'aborted')
  const abortedController = new AbortController()
  abortedController.abort()
  const interrupted = await abortedManager.confirmCommit(abortedDraft.proposal?.commit?.commitId ?? '', abortedDraft.proposal?.commit?.confirmationDigest ?? '', { authorize: async () => ({ allowed: true, auditId: 'must-not-use', reason: 'must not use' }) }, undefined, abortedController.signal)
  assert.equal(interrupted.proposal?.commit?.status, 'interrupted')
  assert.equal(interrupted.proposal?.commit?.executionStatus, 'commit-not-created')
  assert.equal(abortedAdapter.commitCount, 0)

  const expiringAdapter = new FakeGitAdapter()
  const expiringManager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter: expiringAdapter, limits: { expirationMs: 25 } })
  expiringManager.registerSession(createSession())
  const expiringDraft = await prepareVerifiedCommitDraft(expiringManager, happyRunner, 'expired')
  await new Promise((resolve) => setTimeout(resolve, 40))
  const expired = await expiringManager.confirmCommit(expiringDraft.proposal?.commit?.commitId ?? '', expiringDraft.proposal?.commit?.confirmationDigest ?? '', { authorize: async () => ({ allowed: true, auditId: 'must-not-use', reason: 'must not use' }) })
  assert.equal(expired.proposal?.commit?.status, 'blocked')
  assert.equal(expired.proposal?.commit?.executionStatus, 'commit-not-created')
  assert.equal(expiringAdapter.commitCount, 0)

  const deniedAdapter = new FakeGitAdapter()
  const deniedManager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter: deniedAdapter })
  deniedManager.registerSession(createSession())
  const deniedPending = await deniedManager.prepare(request())
  const deniedConfirmed = await deniedManager.confirm(deniedPending.proposal?.proposalId ?? '', deniedPending.proposal?.confirmationDigest ?? '')
  const deniedPatch = await deniedManager.preparePatch({ proposalId: deniedConfirmed.proposal?.proposalId ?? '', patchText: validPatch() })
  const deniedApplied = await deniedManager.confirmPatch(deniedPatch.proposal?.patch?.patchId ?? '', deniedPatch.proposal?.patch?.confirmationDigest ?? '')
  const deniedVerified = await deniedManager.verifyPatch({ patchId: deniedApplied.proposal?.patch?.patchId ?? '', confirmationDigest: deniedApplied.proposal?.patch?.confirmationDigest ?? '', recipeId: 'denied' }, happyRunner)
  const deniedDraft = await deniedManager.prepareCommit({ proposalId: deniedVerified.proposal?.proposalId ?? '', commitMessage: 'feat: denied approval' })
  const denied = await deniedManager.confirmCommit(deniedDraft.proposal?.commit?.commitId ?? '', deniedDraft.proposal?.commit?.confirmationDigest ?? '', { authorize: async () => ({ allowed: false, reason: 'user rejected' }) })
  assert.equal(denied.proposal?.commit?.status, 'awaiting-confirmation')
  assert.equal(deniedAdapter.commitCount, 0)
  const rejected = deniedManager.rejectCommit(deniedDraft.proposal?.commit?.commitId ?? '')
  assert.equal(rejected.proposal?.commit?.status, 'rejected')
  const rejectedReplay = await deniedManager.confirmCommit(deniedDraft.proposal?.commit?.commitId ?? '', deniedDraft.proposal?.commit?.confirmationDigest ?? '', { authorize: async () => ({ allowed: true, auditId: 'must-not-use', reason: 'must not use' }) })
  assert.equal(rejectedReplay.proposal?.commit?.status, 'rejected')
  assert.equal(deniedAdapter.commitCount, 0)

  const failingAdapter = new FakeGitAdapter()
  failingAdapter.failCommit = true
  const failingManager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter: failingAdapter })
  failingManager.registerSession(createSession())
  const failingPending = await failingManager.prepare(request())
  const failingConfirmed = await failingManager.confirm(failingPending.proposal?.proposalId ?? '', failingPending.proposal?.confirmationDigest ?? '')
  const failingPatch = await failingManager.preparePatch({ proposalId: failingConfirmed.proposal?.proposalId ?? '', patchText: validPatch() })
  const failingApplied = await failingManager.confirmPatch(failingPatch.proposal?.patch?.patchId ?? '', failingPatch.proposal?.patch?.confirmationDigest ?? '')
  const failingVerified = await failingManager.verifyPatch({ patchId: failingApplied.proposal?.patch?.patchId ?? '', confirmationDigest: failingApplied.proposal?.patch?.confirmationDigest ?? '', recipeId: 'failing' }, happyRunner)
  const failingDraft = await failingManager.prepareCommit({ proposalId: failingVerified.proposal?.proposalId ?? '', commitMessage: 'feat: failing commit' })
  const failed = await failingManager.confirmCommit(failingDraft.proposal?.commit?.commitId ?? '', failingDraft.proposal?.commit?.confirmationDigest ?? '', { authorize: async () => ({ allowed: true, auditId: 'approval-fail', reason: 'approved' }) })
  assert.equal(failed.proposal?.commit?.status, 'blocked')
  assert.equal(failed.proposal?.commit?.executionStatus, 'commit-not-created')
  assert.equal((await failingManager.release(failingDraft.proposal?.proposalId ?? '')).status, 'blocked')
  assert.equal(failingAdapter.removeCount, 0)

  const uncertainAdapter = new FakeGitAdapter()
  uncertainAdapter.failCommitPostcondition = true
  const uncertainManager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter: uncertainAdapter })
  uncertainManager.registerSession(createSession())
  const uncertainPending = await uncertainManager.prepare(request())
  const uncertainConfirmed = await uncertainManager.confirm(uncertainPending.proposal?.proposalId ?? '', uncertainPending.proposal?.confirmationDigest ?? '')
  const uncertainPatch = await uncertainManager.preparePatch({ proposalId: uncertainConfirmed.proposal?.proposalId ?? '', patchText: validPatch() })
  const uncertainApplied = await uncertainManager.confirmPatch(uncertainPatch.proposal?.patch?.patchId ?? '', uncertainPatch.proposal?.patch?.confirmationDigest ?? '')
  const uncertainVerified = await uncertainManager.verifyPatch({ patchId: uncertainApplied.proposal?.patch?.patchId ?? '', confirmationDigest: uncertainApplied.proposal?.patch?.confirmationDigest ?? '', recipeId: 'uncertain' }, happyRunner)
  const uncertainDraft = await uncertainManager.prepareCommit({ proposalId: uncertainVerified.proposal?.proposalId ?? '', commitMessage: 'feat: uncertain commit' })
  const uncertain = await uncertainManager.confirmCommit(uncertainDraft.proposal?.commit?.commitId ?? '', uncertainDraft.proposal?.commit?.confirmationDigest ?? '', { authorize: async () => ({ allowed: true, auditId: 'approval-uncertain', reason: 'approved' }) })
  assert.equal(uncertain.proposal?.commit?.status, 'blocked')
  assert.equal(uncertain.proposal?.commit?.executionStatus, 'commit-creation-unknown')
  assert.equal(uncertainAdapter.removeCount, 0)
})

test('source landing requires exact base and approval, then fast-forwards once', async () => {
  const adapter = new FakeGitAdapter()
  const manager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter })
  manager.registerSession(createSession())
  const created = await prepareCreatedCommit(manager, passedVerificationRunner(), 'landing-happy')
  const draft = await manager.prepareLanding({ proposalId: created.proposal?.proposalId ?? '' })
  assert.equal(draft.status, 'confirmed')
  assert.equal(draft.operationStatus, 'landing-awaiting-confirmation')
  assert.equal(draft.proposal?.landing?.status, 'awaiting-confirmation')
  assert.equal(draft.proposal?.sourceLanded, false)
  assert.equal(adapter.landCount, 0)

  const mismatch = await manager.confirmLanding(draft.proposal?.landing?.landingId ?? '', '0'.repeat(64), { authorize: async () => ({ allowed: true, auditId: 'must-not-use', reason: 'must not use' }) })
  assert.equal(mismatch.proposal?.landing?.status, 'awaiting-confirmation')
  assert.equal(adapter.landCount, 0)

  const denied = await manager.confirmLanding(draft.proposal?.landing?.landingId ?? '', draft.proposal?.landing?.confirmationDigest ?? '', { authorize: async () => ({ allowed: false, reason: 'user rejected' }) })
  assert.equal(denied.proposal?.landing?.status, 'awaiting-confirmation')
  assert.equal(adapter.landCount, 0)

  const landed = await manager.confirmLanding(draft.proposal?.landing?.landingId ?? '', draft.proposal?.landing?.confirmationDigest ?? '', { authorize: async () => ({ allowed: true, auditId: 'landing-approval-1', reason: 'approved' }) })
  assert.equal(landed.status, 'confirmed')
  assert.equal(landed.operationStatus, 'landing-completed')
  assert.equal(landed.proposal?.landing?.status, 'landed')
  assert.equal(landed.proposal?.landing?.executionStatus, 'landing-completed')
  assert.equal(landed.proposal?.landing?.landedRevision, adapter.commitRevision)
  assert.equal(landed.proposal?.landing?.approvalAuditId, 'landing-approval-1')
  assert.equal(landed.proposal?.sourceLanded, true)
  assert.equal(landed.proposal?.executionStatus.landing, 'landing-completed')
  assert.equal(landed.proposal?.executionStatus.push, 'push-not-performed')
  assert.equal(adapter.landCount, 1)

  const replay = await manager.confirmLanding(draft.proposal?.landing?.landingId ?? '', draft.proposal?.landing?.confirmationDigest ?? '', { authorize: async () => ({ allowed: true, auditId: 'must-not-use', reason: 'must not use' }) })
  assert.equal(replay.proposal?.landing?.status, 'landed')
  assert.equal(adapter.landCount, 1)
  assert.equal((await manager.release(draft.proposal?.proposalId ?? '')).status, 'released')
})

test('source landing fails closed for source drift, abort, expiry, Git failure, and unknown postcondition', async () => {
  const driftAdapter = new FakeGitAdapter()
  driftAdapter.sourceDirty = true
  const driftManager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter: driftAdapter })
  driftManager.registerSession(createSession())
  const driftCreated = await prepareCreatedCommit(driftManager, passedVerificationRunner(), 'landing-dirty')
  const dirty = await driftManager.prepareLanding({ proposalId: driftCreated.proposal?.proposalId ?? '' })
  assert.equal(dirty.proposal?.landing, undefined)
  assert.match(dirty.reason, /clean source/)
  assert.equal(driftAdapter.landCount, 0)

  const baseAdapter = new FakeGitAdapter()
  const baseManager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter: baseAdapter })
  baseManager.registerSession(createSession())
  const baseCreated = await prepareCreatedCommit(baseManager, passedVerificationRunner(), 'landing-drift')
  const baseDraft = await baseManager.prepareLanding({ proposalId: baseCreated.proposal?.proposalId ?? '' })
  baseAdapter.sourceRevision = 'different-base'
  const baseBlocked = await baseManager.confirmLanding(baseDraft.proposal?.landing?.landingId ?? '', baseDraft.proposal?.landing?.confirmationDigest ?? '', { authorize: async () => ({ allowed: true, auditId: 'must-not-use', reason: 'must not use' }) })
  assert.equal(baseBlocked.proposal?.landing?.status, 'blocked')
  assert.equal(baseBlocked.proposal?.landing?.executionStatus, 'landing-not-performed')
  assert.equal(baseAdapter.landCount, 0)

  const abortedAdapter = new FakeGitAdapter()
  const abortedManager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter: abortedAdapter })
  abortedManager.registerSession(createSession())
  const abortedCreated = await prepareCreatedCommit(abortedManager, passedVerificationRunner(), 'landing-abort')
  const abortedDraft = await abortedManager.prepareLanding({ proposalId: abortedCreated.proposal?.proposalId ?? '' })
  const controller = new AbortController()
  controller.abort()
  const interrupted = await abortedManager.confirmLanding(abortedDraft.proposal?.landing?.landingId ?? '', abortedDraft.proposal?.landing?.confirmationDigest ?? '', { authorize: async () => ({ allowed: true, auditId: 'must-not-use', reason: 'must not use' }) }, undefined, controller.signal)
  assert.equal(interrupted.proposal?.landing?.status, 'interrupted')
  assert.equal(interrupted.proposal?.landing?.executionStatus, 'landing-not-performed')
  assert.equal(abortedAdapter.landCount, 0)

  const expiringAdapter = new FakeGitAdapter()
  const expiringManager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter: expiringAdapter, limits: { expirationMs: 25 } })
  expiringManager.registerSession(createSession())
  const expiringCreated = await prepareCreatedCommit(expiringManager, passedVerificationRunner(), 'landing-expired')
  const expiringDraft = await expiringManager.prepareLanding({ proposalId: expiringCreated.proposal?.proposalId ?? '' })
  await new Promise((resolve) => setTimeout(resolve, 40))
  const expired = await expiringManager.confirmLanding(expiringDraft.proposal?.landing?.landingId ?? '', expiringDraft.proposal?.landing?.confirmationDigest ?? '', { authorize: async () => ({ allowed: true, auditId: 'must-not-use', reason: 'must not use' }) })
  assert.equal(expired.proposal?.landing?.status, 'blocked')
  assert.equal(expired.proposal?.landing?.executionStatus, 'landing-not-performed')
  assert.equal(expiringAdapter.landCount, 0)

  const failedAdapter = new FakeGitAdapter()
  failedAdapter.failLanding = true
  const failedManager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter: failedAdapter })
  failedManager.registerSession(createSession())
  const failedCreated = await prepareCreatedCommit(failedManager, passedVerificationRunner(), 'landing-failed')
  const failedDraft = await failedManager.prepareLanding({ proposalId: failedCreated.proposal?.proposalId ?? '' })
  const failed = await failedManager.confirmLanding(failedDraft.proposal?.landing?.landingId ?? '', failedDraft.proposal?.landing?.confirmationDigest ?? '', { authorize: async () => ({ allowed: true, auditId: 'approval-failed', reason: 'approved' }) })
  assert.equal(failed.proposal?.landing?.status, 'blocked')
  assert.equal(failed.proposal?.landing?.executionStatus, 'landing-not-performed')
  assert.equal(failedAdapter.landCount, 1)

  const unknownAdapter = new FakeGitAdapter()
  unknownAdapter.failLandingPostcondition = true
  const unknownManager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter: unknownAdapter })
  unknownManager.registerSession(createSession())
  const unknownCreated = await prepareCreatedCommit(unknownManager, passedVerificationRunner(), 'landing-unknown')
  const unknownDraft = await unknownManager.prepareLanding({ proposalId: unknownCreated.proposal?.proposalId ?? '' })
  const unknown = await unknownManager.confirmLanding(unknownDraft.proposal?.landing?.landingId ?? '', unknownDraft.proposal?.landing?.confirmationDigest ?? '', { authorize: async () => ({ allowed: true, auditId: 'approval-unknown', reason: 'approved' }) })
  assert.equal(unknown.proposal?.landing?.status, 'blocked')
  assert.equal(unknown.proposal?.landing?.executionStatus, 'landing-creation-unknown')
  assert.equal(unknown.proposal?.sourceLanded, false)
  assert.equal(unknownAdapter.landCount, 1)
})

test('patch verification fails closed for missing runner, abort, and unexpected worktree changes', async () => {
  const adapter = new FakeGitAdapter()
  const manager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter })
  manager.registerSession(createSession())
  const pending = await manager.prepare(request())
  const confirmed = await manager.confirm(pending.proposal?.proposalId ?? '', pending.proposal?.confirmationDigest ?? '')
  const draft = await manager.preparePatch({ proposalId: confirmed.proposal?.proposalId ?? '', patchText: validPatch() })
  const applied = await manager.confirmPatch(draft.proposal?.patch?.patchId ?? '', draft.proposal?.patch?.confirmationDigest ?? '')
  const verifyRequest = {
    patchId: applied.proposal?.patch?.patchId ?? '',
    confirmationDigest: applied.proposal?.patch?.confirmationDigest ?? '',
    recipeId: 'missing',
  }
  const unavailable = await manager.verifyPatch(verifyRequest, undefined)
  assert.equal(unavailable.operationStatus, 'patch-verification-blocked')
  assert.equal(unavailable.proposal?.patch?.status, 'applied')
  assert.equal(unavailable.proposal?.executionStatus.patch, 'patch-applied')

  const secondManager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter: new FakeGitAdapter() })
  secondManager.registerSession(createSession())
  const secondPending = await secondManager.prepare(request())
  const secondConfirmed = await secondManager.confirm(secondPending.proposal?.proposalId ?? '', secondPending.proposal?.confirmationDigest ?? '')
  const secondDraft = await secondManager.preparePatch({ proposalId: secondConfirmed.proposal?.proposalId ?? '', patchText: validPatch() })
  const secondApplied = await secondManager.confirmPatch(secondDraft.proposal?.patch?.patchId ?? '', secondDraft.proposal?.patch?.confirmationDigest ?? '')
  const aborted = new AbortController()
  aborted.abort()
  const interrupted = await secondManager.verifyPatch({
    patchId: secondApplied.proposal?.patch?.patchId ?? '',
    confirmationDigest: secondApplied.proposal?.patch?.confirmationDigest ?? '',
    recipeId: 'test',
  }, { run: async () => { throw new Error('must not run') } }, undefined, aborted.signal)
  assert.equal(interrupted.proposal?.patch?.verificationStatus, 'interrupted')

  const changedAdapter = new FakeGitAdapter()
  const changedManager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter: changedAdapter })
  changedManager.registerSession(createSession())
  const changedPending = await changedManager.prepare(request())
  const changedConfirmed = await changedManager.confirm(changedPending.proposal?.proposalId ?? '', changedPending.proposal?.confirmationDigest ?? '')
  const changedDraft = await changedManager.preparePatch({ proposalId: changedConfirmed.proposal?.proposalId ?? '', patchText: validPatch() })
  const changedApplied = await changedManager.confirmPatch(changedDraft.proposal?.patch?.patchId ?? '', changedDraft.proposal?.patch?.confirmationDigest ?? '')
  changedAdapter.changedPaths = ['src/index.ts', 'src/unexpected.ts']
  let unexpectedRunnerCalls = 0
  const unexpected = await changedManager.verifyPatch({
    patchId: changedApplied.proposal?.patch?.patchId ?? '',
    confirmationDigest: changedApplied.proposal?.patch?.confirmationDigest ?? '',
    recipeId: 'test',
  }, { run: async () => { unexpectedRunnerCalls += 1; throw new Error('must not run') } })
  assert.equal(unexpected.operationStatus, 'patch-verification-blocked')
  assert.equal(unexpectedRunnerCalls, 0)
})

test('patch validation accepts declared add/modify/delete files and rejects policy or budget violations', async () => {
  const adapter = new FakeGitAdapter()
  const manager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter })
  manager.registerSession(createSession())
  const pending = await manager.prepare(request({
    targets: [
      { relativePath: 'src/index.ts', operation: 'modify' },
      { relativePath: 'src/new.ts', operation: 'add' },
      { relativePath: 'src/old.ts', operation: 'delete' },
    ],
  }))
  const confirmed = await manager.confirm(pending.proposal?.proposalId ?? '', pending.proposal?.confirmationDigest ?? '')
  const multiFilePatch = `${validPatch()}diff --git a/src/new.ts b/src/new.ts
new file mode 100644
--- /dev/null
+++ b/src/new.ts
@@ -0,0 +1 @@
+export const created = true
diff --git a/src/old.ts b/src/old.ts
deleted file mode 100644
--- a/src/old.ts
+++ /dev/null
@@ -1 +0,0 @@
-old
`
  const draft = await manager.preparePatch({ proposalId: confirmed.proposal?.proposalId ?? '', patchText: multiFilePatch })
  assert.equal(draft.proposal?.patch?.summary.files.map((file) => file.operation).join(','), 'modify,add,delete')
  assert.equal(draft.proposal?.patch?.summary.files.length, 3)

  const invalidPathManager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter: new FakeGitAdapter() })
  invalidPathManager.registerSession(createSession())
  const invalidPending = await invalidPathManager.prepare(request())
  const invalidConfirmed = await invalidPathManager.confirm(invalidPending.proposal?.proposalId ?? '', invalidPending.proposal?.confirmationDigest ?? '')
  const outside = await invalidPathManager.preparePatch({ proposalId: invalidConfirmed.proposal?.proposalId ?? '', patchText: validPatch().replaceAll('src/index.ts', '../outside.ts') })
  assert.equal(outside.proposal?.patch, undefined)
  assert.match(outside.reason, /outside|traversal|target/)

  const unsupported = await invalidPathManager.preparePatch({ proposalId: invalidConfirmed.proposal?.proposalId ?? '', patchText: validPatch().replace('--- a/src/index.ts', 'old mode 100644\n--- a/src/index.ts') })
  assert.equal(unsupported.proposal?.patch, undefined)
  assert.match(unsupported.reason, /unsupported|mode/)

  const secret = await invalidPathManager.preparePatch({ proposalId: invalidConfirmed.proposal?.proposalId ?? '', patchText: validPatch('token = "sk-abcdefghijklmnop"') })
  assert.equal(secret.proposal?.patch, undefined)
  assert.match(secret.reason, /secret-like/)

  const budgetManager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter: new FakeGitAdapter(), limits: { maxPatchBytes: 16 } })
  budgetManager.registerSession(createSession())
  const budgetPending = await budgetManager.prepare(request())
  const budgetConfirmed = await budgetManager.confirm(budgetPending.proposal?.proposalId ?? '', budgetPending.proposal?.confirmationDigest ?? '')
  const budget = await budgetManager.preparePatch({ proposalId: budgetConfirmed.proposal?.proposalId ?? '', patchText: validPatch() })
  assert.match(budget.reason, /budget/)
})

test('patch state machine fails closed for rejection, abort, dirty worktrees, and apply failure', async () => {
  const adapter = new FakeGitAdapter()
  const manager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter })
  manager.registerSession(createSession())
  const pending = await manager.prepare(request())
  const confirmed = await manager.confirm(pending.proposal?.proposalId ?? '', pending.proposal?.confirmationDigest ?? '')
  adapter.dirty = true
  const dirty = await manager.preparePatch({ proposalId: confirmed.proposal?.proposalId ?? '', patchText: validPatch() })
  assert.equal(dirty.proposal?.patch, undefined)
  adapter.dirty = false

  const secondDraft = await manager.preparePatch({ proposalId: confirmed.proposal?.proposalId ?? '', patchText: validPatch() })
  const rejected = manager.rejectPatch(secondDraft.proposal?.patch?.patchId ?? '')
  assert.equal(rejected.proposal?.patch?.status, 'rejected')
  const rejectedReplay = await manager.confirmPatch(secondDraft.proposal?.patch?.patchId ?? '', secondDraft.proposal?.patch?.confirmationDigest ?? '')
  assert.equal(rejectedReplay.proposal?.patch?.status, 'rejected')
  assert.equal(adapter.applyPatchCount, 0)

  const thirdPending = await manager.prepare(request())
  const thirdConfirmed = await manager.confirm(thirdPending.proposal?.proposalId ?? '', thirdPending.proposal?.confirmationDigest ?? '')
  const thirdDraft = await manager.preparePatch({ proposalId: thirdConfirmed.proposal?.proposalId ?? '', patchText: validPatch() })
  const aborted = new AbortController()
  aborted.abort()
  const interrupted = await manager.confirmPatch(thirdDraft.proposal?.patch?.patchId ?? '', thirdDraft.proposal?.patch?.confirmationDigest ?? '', aborted.signal)
  assert.equal(interrupted.proposal?.patch?.status, 'interrupted')
  assert.equal(adapter.applyPatchCount, 0)

  const failureManager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter: Object.assign(new FakeGitAdapter(), { failPatch: true }) })
  failureManager.registerSession(createSession())
  const failurePending = await failureManager.prepare(request())
  const failureConfirmed = await failureManager.confirm(failurePending.proposal?.proposalId ?? '', failurePending.proposal?.confirmationDigest ?? '')
  const failureDraft = await failureManager.preparePatch({ proposalId: failureConfirmed.proposal?.proposalId ?? '', patchText: validPatch() })
  const failed = await failureManager.confirmPatch(failureDraft.proposal?.patch?.patchId ?? '', failureDraft.proposal?.patch?.confirmationDigest ?? '')
  assert.equal(failed.proposal?.patch?.status, 'blocked')
  assert.equal(failed.proposal?.patch?.executionStatus, 'patch-not-applied')

  const identityAdapter = new FakeGitAdapter()
  const identityManager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter: identityAdapter })
  identityManager.registerSession(createSession())
  const identityPending = await identityManager.prepare(request())
  const identityConfirmed = await identityManager.confirm(identityPending.proposal?.proposalId ?? '', identityPending.proposal?.confirmationDigest ?? '')
  const identityDraft = await identityManager.preparePatch({ proposalId: identityConfirmed.proposal?.proposalId ?? '', patchText: validPatch() })
  identityAdapter.identityMismatch = true
  const identityBlocked = await identityManager.confirmPatch(identityDraft.proposal?.patch?.patchId ?? '', identityDraft.proposal?.patch?.confirmationDigest ?? '')
  assert.equal(identityBlocked.proposal?.patch?.status, 'blocked')
  assert.equal(identityAdapter.applyPatchCount, 0)

  const postconditionAdapter = new FakeGitAdapter()
  const postconditionManager = new ChangeProposalManager(createConfig(fixtureRoot), { adapter: postconditionAdapter })
  postconditionManager.registerSession(createSession())
  const postconditionPending = await postconditionManager.prepare(request())
  const postconditionConfirmed = await postconditionManager.confirm(postconditionPending.proposal?.proposalId ?? '', postconditionPending.proposal?.confirmationDigest ?? '')
  const postconditionDraft = await postconditionManager.preparePatch({ proposalId: postconditionConfirmed.proposal?.proposalId ?? '', patchText: validPatch() })
  postconditionAdapter.failPostcondition = true
  const unknown = await postconditionManager.confirmPatch(postconditionDraft.proposal?.patch?.patchId ?? '', postconditionDraft.proposal?.patch?.confirmationDigest ?? '')
  assert.equal(unknown.proposal?.patch?.status, 'blocked')
  assert.equal(unknown.proposal?.patch?.executionStatus, 'patch-application-unknown')
  assert.equal(unknown.proposal?.executionStatus.patch, 'patch-application-unknown')
})

test('node Git adapter creates and removes a detached worktree without network access', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'repo-atlas-git-'))
  try {
    await runGit(root, ['init', '-q'])
    await runGit(root, ['config', 'user.email', 'repo-atlas@example.test'])
    await runGit(root, ['config', 'user.name', 'RepoAtlas Test'])
    await fs.writeFile(path.join(root, 'README.md'), 'fixture\n')
    await runGit(root, ['add', 'README.md'])
    await runGit(root, ['commit', '-qm', 'fixture'])
    await fs.writeFile(path.join(root, 'local-change.txt'), 'must stay in source only')

    const adapter = createNodeGitWorktreeAdapter()
    const revision = await adapter.discover(root)
    const worktree = await adapter.create(revision.repositoryRoot, revision.baseRevision)
    assert.equal(path.resolve(worktree.path).startsWith(path.resolve(root)), false)
    assert.equal(await fs.readFile(path.join(root, 'local-change.txt'), 'utf8'), 'must stay in source only')
    await assert.rejects(() => fs.access(path.join(worktree.path, 'local-change.txt')))
    const inspected = await adapter.inspect(revision.repositoryRoot, worktree)
    assert.equal(inspected.dirty, false)
    assert.equal(inspected.identity, worktree.identity)
    await adapter.applyPatch(revision.repositoryRoot, worktree, `diff --git a/README.md b/README.md
--- a/README.md
+++ b/README.md
@@ -1 +1 @@
-fixture
+patched
`, '')
    assert.equal(await fs.readFile(path.join(root, 'README.md'), 'utf8'), 'fixture\n')
    assert.equal(await fs.readFile(path.join(worktree.path, 'README.md'), 'utf8'), 'patched\n')
    const patched = await adapter.inspect(revision.repositoryRoot, worktree)
    assert.equal(patched.dirty, true)
    assert.deepEqual(patched.changedPaths, ['README.md'])
    const commitRevision = await adapter.commit(revision.repositoryRoot, worktree, ['README.md'], 'feat: isolated fixture change')
    assert.match(commitRevision, /^[0-9a-f]{40}$/)
    assert.equal(await fs.readFile(path.join(root, 'README.md'), 'utf8'), 'fixture\n')
    assert.equal(await fs.readFile(path.join(worktree.path, 'README.md'), 'utf8'), 'patched\n')
    const committed = await adapter.inspect(revision.repositoryRoot, worktree)
    assert.equal(committed.dirty, false)
    assert.deepEqual(committed.changedPaths, [])
    assert.equal(committed.baseRevision, commitRevision)
    assert.equal(committed.identity, worktree.identity)
    await adapter.remove(revision.repositoryRoot, worktree)
    await assert.rejects(() => fs.access(worktree.path))
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})

test('node Git adapter fast-forwards the clean source workspace from an isolated commit', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'repo-atlas-landing-'))
  try {
    await runGit(root, ['init', '-q'])
    await runGit(root, ['config', 'user.email', 'repo-atlas@example.test'])
    await runGit(root, ['config', 'user.name', 'RepoAtlas Test'])
    await fs.writeFile(path.join(root, 'README.md'), 'fixture\n')
    await runGit(root, ['add', 'README.md'])
    await runGit(root, ['commit', '-qm', 'fixture'])

    const adapter = createNodeGitWorktreeAdapter()
    const revision = await adapter.discover(root)
    const worktree = await adapter.create(revision.repositoryRoot, revision.baseRevision)
    await adapter.applyPatch(revision.repositoryRoot, worktree, `diff --git a/README.md b/README.md
--- a/README.md
+++ b/README.md
@@ -1 +1 @@
-fixture
+landed
`, '')
    const commitRevision = await adapter.commit(revision.repositoryRoot, worktree, ['README.md'], 'feat: land fixture change')
    const sourceBefore = await adapter.inspectSource(revision.repositoryRoot, root)
    assert.equal(sourceBefore.revision, revision.baseRevision)
    assert.equal(sourceBefore.dirty, false)
    const landedRevision = await adapter.land(revision.repositoryRoot, root, revision.baseRevision, commitRevision)
    assert.equal(landedRevision, commitRevision)
    assert.equal(await fs.readFile(path.join(root, 'README.md'), 'utf8'), 'landed\n')
    const sourceAfter = await adapter.inspectSource(revision.repositoryRoot, root)
    assert.equal(sourceAfter.revision, commitRevision)
    assert.equal(sourceAfter.dirty, false)
    const committed = await adapter.inspect(revision.repositoryRoot, worktree)
    assert.equal(committed.dirty, false)
    assert.equal(committed.identity, worktree.identity)
    await adapter.remove(revision.repositoryRoot, worktree)
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})

test('node Git adapter refuses source revision drift without creating a merge', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'repo-atlas-landing-drift-'))
  try {
    await runGit(root, ['init', '-q'])
    await runGit(root, ['config', 'user.email', 'repo-atlas@example.test'])
    await runGit(root, ['config', 'user.name', 'RepoAtlas Test'])
    await fs.writeFile(path.join(root, 'README.md'), 'fixture\n')
    await runGit(root, ['add', 'README.md'])
    await runGit(root, ['commit', '-qm', 'fixture'])

    const adapter = createNodeGitWorktreeAdapter()
    const revision = await adapter.discover(root)
    const worktree = await adapter.create(revision.repositoryRoot, revision.baseRevision)
    await adapter.applyPatch(revision.repositoryRoot, worktree, `diff --git a/README.md b/README.md
--- a/README.md
+++ b/README.md
@@ -1 +1 @@
-fixture
+isolated
`, '')
    const commitRevision = await adapter.commit(revision.repositoryRoot, worktree, ['README.md'], 'feat: isolated divergent change')
    await fs.writeFile(path.join(root, 'README.md'), 'source-diverged\n')
    await runGit(root, ['add', 'README.md'])
    await runGit(root, ['commit', '-qm', 'source diverged'])
    await assert.rejects(() => adapter.land(revision.repositoryRoot, root, revision.baseRevision, commitRevision), /expected base revision/)
    assert.equal(await fs.readFile(path.join(root, 'README.md'), 'utf8'), 'source-diverged\n')
    await adapter.remove(revision.repositoryRoot, worktree)
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})

async function runGit(cwd: string, args: string[]): Promise<void> {
  await execFileAsync('git', args, { cwd, shell: false, windowsHide: true, maxBuffer: 64 * 1024 })
}
