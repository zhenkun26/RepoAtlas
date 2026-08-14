import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { createConfig } from '../src/config.ts'
import { runControlledAction, type ControlledActionRuntime } from '../src/actions/runtime.ts'

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

test('controlled runner uses the sandbox-wrapped argv and redacts bounded output', async () => {
  let receivedArgv: readonly string[] = []
  let receivedPolicy: { mode: 'read-only' | 'workspace-write'; workspaceRoot: string } | undefined
  let receivedSpawn: { argv: readonly string[]; cwd: string; stdio: { stdout: { maxBytes: number }; stderr: { maxBytes: number } } } | undefined
  const runtime: ControlledActionRuntime = {
    sandboxPolicy: { resolve: ({ mode }) => ({ mode, workspaceRoot }) },
    sandbox: {
      confine(argv, policy) {
        receivedArgv = argv
        receivedPolicy = policy
        return {
          argv: ['sandbox-runner', '--', ...argv],
          enforcement: 'full',
          denialSignatures: [],
          runnerFailureRules: [],
        }
      },
    },
    subprocess: {
      spawn(spec) {
        receivedSpawn = spec
        return {
          collected: {
            stdout: { readFrom: () => ({ text: 'ok token=sk-abcdefghijklmnopqrstuvwxyz', nextOffset: 40, lossy: true }) },
            stderr: { readFrom: () => ({ text: '', nextOffset: 0, lossy: false }) },
          },
          done: Promise.resolve({ exitCode: 0, signal: null }),
          terminate() {},
        }
      },
    },
  }

  const result = await runControlledAction(
    createConfig(workspaceRoot, { controlledActions: { enabled: true, recipes: [recipe] } }),
    { recipeId: recipe.id, cwd: 'src', goalConfirmed: true, userConfirmed: true },
    runtime,
  )

  assert.equal(result.status, 'success')
  assert.equal(result.outputTruncated, true)
  assert.equal(result.redacted, true)
  assert.match(result.stdout, /REDACTED_SECRET/)
  assert.deepEqual(receivedArgv, ['npm', 'test'])
  assert.deepEqual(receivedPolicy, { mode: 'read-only', workspaceRoot })
  assert.deepEqual(receivedSpawn?.argv, ['sandbox-runner', '--', 'npm', 'test'])
  assert.equal(receivedSpawn?.cwd, path.join(workspaceRoot, 'src'))
  assert.equal(receivedSpawn?.stdio.stdout.maxBytes, recipe.maxOutputBytes)
  assert.equal(receivedSpawn?.stdio.stderr.maxBytes, recipe.maxOutputBytes)
})

test('sandbox absence or partial enforcement fails closed before subprocess spawn', async () => {
  let spawnCount = 0
  const config = createConfig(workspaceRoot, { controlledActions: { enabled: true, recipes: [recipe] } })
  const base: ControlledActionRuntime = {
    sandboxPolicy: { resolve: ({ mode }) => ({ mode, workspaceRoot }) },
    subprocess: { spawn: () => {
      spawnCount += 1
      throw new Error('must not spawn')
    } },
  }

  const missing = await runControlledAction(config, { recipeId: recipe.id, goalConfirmed: true, userConfirmed: true }, base)
  assert.equal(missing.status, 'sandbox-unavailable')
  assert.equal(spawnCount, 0)

  const partial = await runControlledAction(config, { recipeId: recipe.id, goalConfirmed: true, userConfirmed: true }, {
    ...base,
    sandbox: { confine: () => ({ argv: ['partial-runner', 'npm', 'test'], enforcement: 'partial', denialSignatures: [], runnerFailureRules: [] }) },
  })
  assert.equal(partial.status, 'sandbox-unavailable')
  assert.equal(spawnCount, 0)
})

test('timeout aborts and terminates the managed process', async () => {
  let terminated = false
  const shortRecipe = { ...recipe, timeoutMs: 10 }
  const runtime: ControlledActionRuntime = {
    sandboxPolicy: { resolve: ({ mode }) => ({ mode, workspaceRoot }) },
    sandbox: { confine: (argv) => ({ argv: [...argv], enforcement: 'full', denialSignatures: [], runnerFailureRules: [] }) },
    subprocess: {
      spawn(spec) {
        const done = new Promise<{ exitCode: number | null; signal: string | null }>((resolve) => {
          spec.signal?.addEventListener('abort', () => {
            terminated = true
            resolve({ exitCode: null, signal: 'SIGTERM' })
          }, { once: true })
        })
        return {
          collected: {},
          done,
          terminate() { terminated = true },
        }
      },
    },
  }

  const result = await runControlledAction(
    createConfig(workspaceRoot, { controlledActions: { enabled: true, recipes: [shortRecipe] } }),
    { recipeId: shortRecipe.id, goalConfirmed: true, userConfirmed: true },
    runtime,
  )
  assert.equal(result.status, 'timed-out')
  assert.equal(terminated, true)
})

test('sandbox runner failures are not reported as successful actions', async () => {
  const runtime: ControlledActionRuntime = {
    sandboxPolicy: { resolve: ({ mode }) => ({ mode, workspaceRoot }) },
    sandbox: { confine: (argv) => ({
      argv: [...argv],
      enforcement: 'full',
      denialSignatures: [],
      runnerFailureRules: [{ fatalSignatures: ['runner unavailable'] }],
    }) },
    subprocess: {
      spawn: () => ({
        collected: { stderr: { readFrom: () => ({ text: 'runner unavailable', nextOffset: 18, lossy: false }) } },
        done: Promise.resolve({ exitCode: 1, signal: null }),
        terminate() {},
      }),
    },
  }
  const result = await runControlledAction(
    createConfig(workspaceRoot, { controlledActions: { enabled: true, recipes: [recipe] } }),
    { recipeId: recipe.id, goalConfirmed: true, userConfirmed: true },
    runtime,
  )
  assert.equal(result.status, 'sandbox-unavailable')
})
