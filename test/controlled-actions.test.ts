import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { createConfig } from '../src/config.ts'
import { decideControlledAction } from '../src/actions/controlled.ts'

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

test('controlled actions stay disabled unless explicitly configured', () => {
  const config = createConfig(workspaceRoot, { controlledActions: { enabled: false, recipes: [recipe] } })
  const decision = decideControlledAction(config, { recipeId: 'test', goalConfirmed: true, userConfirmed: true })
  assert.equal(decision.allowed, false)
  assert.match(decision.reason, /disabled/)
})

test('approved recipe is limited to one confirmed action inside the workspace', () => {
  const config = createConfig(workspaceRoot, { controlledActions: { enabled: true, recipes: [recipe] } })
  const decision = decideControlledAction(config, {
    recipeId: 'test',
    cwd: 'src',
    goalConfirmed: true,
    userConfirmed: true,
  })
  assert.equal(decision.allowed, true)
  assert.equal(decision.cwd, path.join(workspaceRoot, 'src'))
  assert.deepEqual(decision.recipe?.args, ['test'])
})

test('missing confirmation, unknown recipes, and escaped cwd are denied', () => {
  const config = createConfig(workspaceRoot, { controlledActions: { enabled: true, recipes: [recipe] } })
  assert.equal(decideControlledAction(config, { recipeId: 'test', goalConfirmed: false, userConfirmed: true }).allowed, false)
  assert.equal(decideControlledAction(config, { recipeId: 'missing', goalConfirmed: true, userConfirmed: true }).allowed, false)
  assert.equal(decideControlledAction(config, { recipeId: 'test', cwd: '../', goalConfirmed: true, userConfirmed: true }).allowed, false)
})

test('recipe validation rejects shell execution and path-shaped executables', () => {
  assert.throws(() => createConfig(workspaceRoot, {
    controlledActions: { enabled: true, recipes: [{ ...recipe, command: 'bash', args: ['-c', 'npm test'] }] },
  }), /cannot invoke a shell/)
  assert.throws(() => createConfig(workspaceRoot, {
    controlledActions: { enabled: true, recipes: [{ ...recipe, command: './run-tests' }] },
  }), /bare executable name/)
})
