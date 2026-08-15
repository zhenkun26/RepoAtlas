import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { parseAstSource } from '../src/repository/ast-parser.ts'
import { RepositoryScanner } from '../src/repository/scanner.ts'

test('bounded parser emits syntax observations with locations and redacted summaries', () => {
  const result = parseAstSource('src/app.ts', "import { server } from './server.ts'\nexport function start() { return server }\nexport const enabled = true\n", {
    maxTokens: 1_000,
    maxObservations: 20,
    maxObservationTextBytes: 120,
  })

  assert.equal(result.status, 'syntax-confirmed')
  assert.ok(result.observations.some((item) => item.kind === 'import' && item.moduleSpecifier === './server.ts'))
  assert.ok(result.observations.some((item) => item.kind === 'function' && item.name === 'start' && item.line === 2))
  assert.ok(result.observations.some((item) => item.kind === 'variable' && item.name === 'enabled'))
  assert.ok(result.observations.every((item) => item.summary.length <= 120))
})

test('unsupported and malformed source remain explicit partial results', () => {
  const unsupported = parseAstSource('README.md', '# not source', { maxTokens: 100, maxObservations: 10, maxObservationTextBytes: 100 })
  assert.equal(unsupported.status, 'not-analyzed')
  assert.equal(unsupported.observations.length, 0)

  const malformed = parseAstSource('src/broken.ts', 'export function broken() {', { maxTokens: 100, maxObservations: 10, maxObservationTextBytes: 100 })
  assert.equal(malformed.status, 'read-failed')
  assert.equal(malformed.observations.length, 0)
})

test('AST token, observation, and AbortSignal limits are bounded', () => {
  const budgeted = parseAstSource('src/large.ts', 'export const one = 1\nexport const two = 2\n', { maxTokens: 4, maxObservations: 20, maxObservationTextBytes: 100 })
  assert.equal(budgeted.status, 'budget-exhausted')
  assert.ok(budgeted.observations.length <= 20)

  const observed = parseAstSource('src/many.ts', 'export const one = 1\nexport const two = 2\n', { maxTokens: 100, maxObservations: 1, maxObservationTextBytes: 100 })
  assert.equal(observed.status, 'budget-exhausted')
  assert.equal(observed.observations.length, 1)

  const controller = new AbortController()
  controller.abort()
  const interrupted = parseAstSource('src/app.ts', 'export const value = true', { signal: controller.signal, maxTokens: 100, maxObservations: 10, maxObservationTextBytes: 100 })
  assert.equal(interrupted.status, 'interrupted')
})

test('scanner parse-ast honors scope and sensitive-path policy without reading denied files', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'repo-atlas-ast-'))
  try {
    await fs.mkdir(path.join(root, 'src'), { recursive: true })
    await fs.writeFile(path.join(root, 'src', 'app.ts'), 'export const app = true\n', 'utf8')
    await fs.writeFile(path.join(root, 'outside.ts'), 'export const outside = true\n', 'utf8')
    await fs.writeFile(path.join(root, '.env'), 'API_KEY=sk-secret-value-123456\n', 'utf8')

    const scanner = new RepositoryScanner(root, { scope: ['src'] })
    await scanner.discover()
    const parsed = await scanner.parseAst('src/app.ts')
    assert.equal(parsed.status, 'syntax-confirmed')
    assert.ok(parsed.observationCount > 0)

    const outside = await scanner.parseAst('outside.ts')
    assert.equal(outside.status, 'safety-skipped')
    const sensitive = await scanner.parseAst('.env')
    assert.equal(sensitive.status, 'safety-skipped')
    assert.equal(scanner.snapshot().budget.readBytes, (await fs.stat(path.join(root, 'src', 'app.ts'))).size)
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})
