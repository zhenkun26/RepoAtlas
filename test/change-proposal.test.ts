import test from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { ChangeProposalManager, createNodeGitWorktreeAdapter, type GitWorktreeAdapter } from '../src/repository/change-proposal.ts'
import { createConfig } from '../src/config.ts'
import { createEvidence } from '../src/evidence.ts'
import type { AnalysisSession, ChangeProposalRequest, ChangeProposalWorktree } from '../src/types.ts'

const execFileAsync = promisify(execFile)
const fixtureRoot = path.resolve('test/fixtures/complete-repo')

class FakeGitAdapter implements GitWorktreeAdapter {
  createCount = 0
  removeCount = 0
  dirty = false
  failDiscovery = false

  async discover(workspaceRoot: string): Promise<{ repositoryRoot: string; baseRevision: string }> {
    if (this.failDiscovery) throw new Error('git unavailable')
    return { repositoryRoot: workspaceRoot, baseRevision: 'base-1' }
  }

  async create(_repositoryRoot: string, baseRevision: string): Promise<ChangeProposalWorktree> {
    this.createCount += 1
    return { path: path.join(os.tmpdir(), 'repo-atlas-fake-worktree'), identity: `identity-${this.createCount}`, baseRevision }
  }

  async inspect(_repositoryRoot: string, worktree: ChangeProposalWorktree): Promise<ChangeProposalWorktree & { dirty: boolean }> {
    return { ...worktree, dirty: this.dirty }
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

test('node Git adapter creates and removes a detached worktree without network access', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'repo-atlas-git-'))
  try {
    await runGit(root, ['init', '-q'])
    await runGit(root, ['config', 'user.email', 'repo-atlas@example.test'])
    await runGit(root, ['config', 'user.name', 'RepoAtlas Test'])
    await fs.writeFile(path.join(root, 'README.md'), 'fixture')
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
    await adapter.remove(revision.repositoryRoot, worktree)
    await assert.rejects(() => fs.access(worktree.path))
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})

async function runGit(cwd: string, args: string[]): Promise<void> {
  await execFileAsync('git', args, { cwd, shell: false, windowsHide: true, maxBuffer: 64 * 1024 })
}
