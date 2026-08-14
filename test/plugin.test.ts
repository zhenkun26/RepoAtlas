import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { apply } from '../src/harness/plugin.ts'

test('Harness adapter registers one public read-only tool', async () => {
  const registered: Array<{
    name: string
    output: { schema: Record<string, unknown>; render(args: unknown, value: unknown): Array<{ type: 'text'; text: string }> }
    execute(input: unknown): Promise<unknown>
  }> = []
  const logs: string[] = []
  apply({ tools: { register: (tool) => registered.push(tool) }, logger: { info: (message) => logs.push(message), warn: () => undefined } }, { workspaceRoot: path.join(process.cwd(), 'test', 'fixtures', 'complete-repo') })
  assert.equal(registered.length, 1)
  assert.equal(registered[0].name, 'repo_atlas_analyze')
  assert.deepEqual(registered[0].output.schema, { type: 'object' })
  assert.match(registered[0].output.render({}, { policy: 'readonly' })[0]?.text ?? '', /"policy": "readonly"/)
  const clarification = await registered[0].execute({}) as { clarification?: { question?: { field?: string } } }
  assert.equal(clarification.clarification?.question?.field, 'intent')
  assert.ok(logs.some((message) => message.includes('read-only')))
})

test('registered tool keeps the clarification gate and produces a report after direct start', async () => {
  let tool: { execute(input: unknown): Promise<unknown> } | undefined
  apply({ tools: { register: (registered) => { tool = registered } } }, {
    workspaceRoot: path.join(process.cwd(), 'test', 'fixtures', 'complete-repo'),
  })
  assert.ok(tool)
  const result = await tool.execute({ start: 'direct', goal: { intent: 'onboarding' } }) as { policy: string; report?: { markdown?: string } }
  assert.equal(result.policy, 'readonly')
  assert.match(result.report?.markdown ?? '', /RepoAtlas/)
})

test('enabled controlled action tool uses host Goal and one-time Harness approval', async () => {
  const workspaceRoot = path.join(process.cwd(), 'test', 'fixtures', 'complete-repo')
  const recipe = {
    id: 'test',
    command: 'npm',
    args: ['test'],
    sandboxMode: 'read-only' as const,
    timeoutMs: 30_000,
    maxOutputBytes: 32_000,
    enabled: true,
  }
  const registered: Array<{ name: string; execute(input: unknown, execution?: { callId?: string; agent?: { session: { header?: { cwd?: string } } }; signal: AbortSignal }): Promise<unknown> }> = []
  const agent = { session: { header: { cwd: workspaceRoot } } }
  let approvalRequest: { toolName: string; callId?: string; reason?: string } | undefined
  let spawnCount = 0
  const services: Record<string, unknown> = {
    goals: { get: () => ({ phase: 'active', activation: 'armed' }) },
    approval: {
      request: async (request: { toolName: string; callId?: string; reason?: string }) => {
        approvalRequest = request
        return 'allowed-once'
      },
    },
    sandboxPolicy: { resolve: ({ mode }: { mode: 'read-only' | 'workspace-write' }) => ({ mode, workspaceRoot }) },
    sandbox: { confine: (argv: readonly string[]) => ({ argv: [...argv], enforcement: 'full', denialSignatures: [], runnerFailureRules: [] }) },
    subprocess: {
      spawn: () => {
        spawnCount += 1
        return {
          collected: { stdout: { readFrom: () => ({ text: 'ok', nextOffset: 2, lossy: false }) } },
          done: Promise.resolve({ exitCode: 0, signal: null }),
          terminate() {},
        }
      },
    },
  }
  apply({
    tools: { register: (tool) => registered.push(tool) },
    get: <T>(name: string) => services[name] as T | undefined,
  }, { workspaceRoot, controlledActions: { enabled: true, recipes: [recipe] } })

  const action = registered.find((tool) => tool.name === 'repo_atlas_controlled_action')
  assert.ok(action)
  const result = await action.execute({ recipeId: 'test', cwd: 'src' }, { callId: 'call-1', agent, signal: new AbortController().signal }) as { status: string; auditId?: string }
  assert.equal(result.status, 'success')
  assert.match(result.auditId ?? '', /^action-/)
  assert.equal(spawnCount, 1)
  assert.equal(approvalRequest?.toolName, 'repo_atlas_controlled_action')
  assert.equal(approvalRequest?.callId, 'call-1')
  assert.match(approvalRequest?.reason ?? '', /test.*src.*read-only/)
})

test('controlled action tool rejects an unknown recipe before asking for approval', async () => {
  const workspaceRoot = path.join(process.cwd(), 'test', 'fixtures', 'complete-repo')
  let approvalCount = 0
  let spawnCount = 0
  const services: Record<string, unknown> = {
    goals: { get: () => ({ phase: 'active', activation: 'armed' }) },
    approval: { request: async () => { approvalCount += 1; return 'allowed-once' } },
    sandboxPolicy: { resolve: ({ mode }: { mode: 'read-only' | 'workspace-write' }) => ({ mode, workspaceRoot }) },
    sandbox: { confine: (argv: readonly string[]) => ({ argv: [...argv], enforcement: 'full', denialSignatures: [], runnerFailureRules: [] }) },
    subprocess: { spawn: () => { spawnCount += 1; throw new Error('must not spawn') } },
  }
  const registered: Array<{ name: string; execute(input: unknown, execution?: { callId?: string; agent?: { session: { header?: { cwd?: string } } }; signal: AbortSignal }): Promise<unknown> }> = []
  apply({
    tools: { register: (tool) => registered.push(tool) },
    get: <T>(name: string) => services[name] as T | undefined,
  }, { workspaceRoot, controlledActions: { enabled: true, recipes: [] } })
  const action = registered.find((tool) => tool.name === 'repo_atlas_controlled_action')
  assert.ok(action)
  const result = await action.execute({ recipeId: 'unknown' }, {
    callId: 'call-unknown',
    agent: { session: { header: { cwd: workspaceRoot } } },
    signal: new AbortController().signal,
  }) as { status: string; reason?: string }
  assert.equal(result.status, 'denied')
  assert.match(result.reason ?? '', /recipe is not configured/)
  assert.equal(approvalCount, 0)
  assert.equal(spawnCount, 0)
})

test('controlled action tool denies without a host Goal and does not ask approval', async () => {
  const workspaceRoot = path.join(process.cwd(), 'test', 'fixtures', 'complete-repo')
  const recipe = {
    id: 'test',
    command: 'npm',
    args: ['test'],
    sandboxMode: 'read-only' as const,
    timeoutMs: 30_000,
    maxOutputBytes: 32_000,
    enabled: true,
  }
  let approvalCount = 0
  let spawnCount = 0
  const services: Record<string, unknown> = {
    goals: { get: () => ({ phase: 'active', activation: 'disarmed' }) },
    approval: { request: async () => { approvalCount += 1; return 'allowed-once' } },
    sandboxPolicy: { resolve: ({ mode }: { mode: 'read-only' | 'workspace-write' }) => ({ mode, workspaceRoot }) },
    sandbox: { confine: (argv: readonly string[]) => ({ argv: [...argv], enforcement: 'full', denialSignatures: [], runnerFailureRules: [] }) },
    subprocess: { spawn: () => { spawnCount += 1; throw new Error('must not spawn') } },
  }
  const registered: Array<{ name: string; execute(input: unknown, execution?: { callId?: string; agent?: { session: { header?: { cwd?: string } } }; signal: AbortSignal }): Promise<unknown> }> = []
  apply({
    tools: { register: (tool) => registered.push(tool) },
    get: <T>(name: string) => services[name] as T | undefined,
  }, { workspaceRoot, controlledActions: { enabled: true, recipes: [recipe] } })
  const action = registered.find((tool) => tool.name === 'repo_atlas_controlled_action')
  assert.ok(action)
  const result = await action.execute({ recipeId: 'test' }, {
    callId: 'call-2',
    agent: { session: { header: { cwd: workspaceRoot } } },
    signal: new AbortController().signal,
  }) as { status: string; reason?: string }
  assert.equal(result.status, 'denied')
  assert.match(result.reason ?? '', /Goal/)
  assert.equal(approvalCount, 0)
  assert.equal(spawnCount, 0)
})
