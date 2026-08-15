import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { createConfig } from '../src/config.ts'
import {
  checkEvidenceCacheCompatibility,
  createEvidenceCache,
  createEvidencePolicyFingerprint,
  getCompatibleEvidenceCache,
  isCacheEntryPathCoveredByScope,
  isPathCoveredByScope,
  normalizeEvidenceScope,
  replaceEvidenceForPaths,
  selectReusableEvidence,
} from '../src/repository/evidence-cache.ts'
import type { Evidence, EvidenceCacheEntry, ScannedFile } from '../src/types.ts'

const root = path.join(process.cwd(), 'test', 'fixtures', 'complete-repo')
const entry: EvidenceCacheEntry = {
  fingerprint: { relativePath: 'src/index.ts', sizeBytes: 120, mtimeMs: 10, ctimeMs: 11 },
  coverage: ['.'],
  evidence: [],
}

test('compatible cache requires the same root, policy, and schema', () => {
  const config = createConfig(root, { scope: ['src'] })
  const cache = createEvidenceCache(config, [entry])
  assert.deepEqual(checkEvidenceCacheCompatibility(cache, createConfig(root, { scope: ['tests'] })), { compatible: true })
  assert.equal(getCompatibleEvidenceCache(cache, config), cache)

  assert.deepEqual(checkEvidenceCacheCompatibility(cache, createConfig(path.dirname(root))), { compatible: false, reason: 'workspace-root' })
  assert.deepEqual(checkEvidenceCacheCompatibility(cache, createConfig(root, { sensitiveFilePatterns: ['*.secret'] })), { compatible: false, reason: 'policy' })
  assert.deepEqual(checkEvidenceCacheCompatibility({ ...cache, schemaVersion: 99 as typeof cache.schemaVersion }, config), { compatible: false, reason: 'schema-version' })
  assert.equal(getCompatibleEvidenceCache({ ...cache, policyFingerprint: 'stale' }, config), undefined)
})

test('policy fingerprint excludes scope because scope is incremental coverage', () => {
  const srcFingerprint = createEvidencePolicyFingerprint(createConfig(root, { scope: ['src'] }))
  const testFingerprint = createEvidencePolicyFingerprint(createConfig(root, { scope: ['tests'] }))
  assert.equal(srcFingerprint, testFingerprint)
})

test('scope coverage is path-bounded and rejects traversal or absolute paths', () => {
  assert.deepEqual(normalizeEvidenceScope(['./src/', 'src', 'tests']), ['src', 'tests'])
  assert.equal(isPathCoveredByScope('src/index.ts', ['src']), true)
  assert.equal(isPathCoveredByScope('src', ['src']), true)
  assert.equal(isPathCoveredByScope('src-old/index.ts', ['src']), false)
  assert.equal(isPathCoveredByScope('tests/app.test.ts', ['src']), false)
  assert.equal(isPathCoveredByScope('../outside.ts', ['.']), false)
  assert.equal(isPathCoveredByScope('/outside.ts', ['.']), false)
  assert.equal(isCacheEntryPathCoveredByScope(entry, ['src']), true)
})

test('matching metadata reuses redacted evidence without selecting a full read', () => {
  const config = createConfig(root)
  const cache = createEvidenceCache(config, [{
    ...entry,
    evidence: [{ evidenceId: 'evidence-cached', sourcePath: 'src/index.ts', locator: '全文（已脱敏）', observation: 'cached', status: 'confirmed', redactionState: 'redacted' }],
  }])
  const files: ScannedFile[] = [
    { relativePath: 'src/index.ts', sizeBytes: 120, kind: 'text', fingerprint: { ...entry.fingerprint } },
    { relativePath: 'src/server.ts', sizeBytes: 80, kind: 'text', fingerprint: { relativePath: 'src/server.ts', sizeBytes: 81, mtimeMs: 10, ctimeMs: 11 } },
    { relativePath: 'src/unknown.ts', sizeBytes: 80, kind: 'text' },
    { relativePath: 'config.pem', sizeBytes: 0, kind: 'sensitive' },
  ]
  const selection = selectReusableEvidence(files, cache, config)
  assert.deepEqual(selection.reusedPaths, ['src/index.ts'])
  assert.deepEqual(selection.rereadPaths, ['src/server.ts', 'src/unknown.ts'])
  assert.deepEqual(selection.evidence.map((item) => item.evidenceId), ['evidence-cached'])
})

test('changed, new, and metadata-unknown files are invalidated and selected for reread', () => {
  const config = createConfig(root)
  const cache = createEvidenceCache(config, [
    {
      ...entry,
      evidence: [{ evidenceId: 'evidence-old', sourcePath: 'src/index.ts', locator: '全文（已脱敏）', observation: 'old', status: 'confirmed', redactionState: 'clean' }],
    },
    {
      fingerprint: { relativePath: 'src/unknown.ts', sizeBytes: 20, mtimeMs: 10, ctimeMs: 11 },
      coverage: ['.'],
      evidence: [{ evidenceId: 'evidence-unknown', sourcePath: 'src/unknown.ts', locator: '全文（已脱敏）', observation: 'unknown', status: 'confirmed', redactionState: 'clean' }],
    },
  ])
  const selection = selectReusableEvidence([
    { relativePath: 'src/index.ts', sizeBytes: 121, kind: 'text', fingerprint: { ...entry.fingerprint, sizeBytes: 121 } },
    { relativePath: 'src/new.ts', sizeBytes: 20, kind: 'text', fingerprint: { relativePath: 'src/new.ts', sizeBytes: 20, mtimeMs: 10, ctimeMs: 11 } },
    { relativePath: 'src/unknown.ts', sizeBytes: 20, kind: 'unreadable' },
  ], cache, config)

  assert.deepEqual(selection.invalidatedPaths, ['src/index.ts', 'src/unknown.ts'])
  assert.deepEqual(selection.newPaths, ['src/new.ts'])
  assert.deepEqual(selection.rereadPaths, ['src/index.ts', 'src/new.ts', 'src/unknown.ts'])
  assert.deepEqual(selection.evidence, [])
})

test('scope-covered files are reread while outside evidence is retained as uncovered', () => {
  const config = createConfig(root, { scope: ['src'] })
  const cachedEvidence = (sourcePath: string, evidenceId: string): Evidence => ({
    evidenceId,
    sourcePath,
    locator: '全文（已脱敏）',
    observation: sourcePath,
    status: 'confirmed',
    redactionState: 'clean',
  })
  const cache = createEvidenceCache(config, [
    { ...entry, evidence: [cachedEvidence('src/index.ts', 'evidence-src')] },
    {
      fingerprint: { relativePath: 'tests/app.test.ts', sizeBytes: 10, mtimeMs: 20, ctimeMs: 21 },
      coverage: ['.'],
      evidence: [cachedEvidence('tests/app.test.ts', 'evidence-tests')],
    },
    {
      fingerprint: { relativePath: 'src/deleted.ts', sizeBytes: 10, mtimeMs: 20, ctimeMs: 21 },
      coverage: ['src'],
      evidence: [cachedEvidence('src/deleted.ts', 'evidence-deleted')],
    },
  ])
  const selection = selectReusableEvidence([
    { relativePath: 'src/index.ts', sizeBytes: 120, kind: 'text', fingerprint: { ...entry.fingerprint } },
  ], cache, config)

  assert.deepEqual(selection.reusedPaths, ['tests/app.test.ts'])
  assert.deepEqual(selection.rereadPaths, ['src/index.ts'])
  assert.deepEqual(selection.removedPaths, ['src/deleted.ts'])
  assert.deepEqual(selection.uncoveredPaths, ['tests/app.test.ts'])
  assert.deepEqual(selection.evidence.map((item) => item.evidenceId), ['evidence-tests'])
})

test('incomplete discovery does not turn an unobserved path into a deletion', () => {
  const config = createConfig(root, { scope: ['src'] })
  const cache = createEvidenceCache(config, [{
    ...entry,
    evidence: [{ evidenceId: 'evidence-cached', sourcePath: 'src/index.ts', locator: '全文（已脱敏）', observation: 'cached', status: 'confirmed', redactionState: 'redacted' }],
  }])
  const selection = selectReusableEvidence([], cache, config, { discoveryComplete: false })
  assert.deepEqual(selection.removedPaths, [])
  assert.deepEqual(selection.uncoveredPaths, ['src/index.ts'])
  assert.deepEqual(selection.evidence.map((item) => item.evidenceId), ['evidence-cached'])
})

test('replacing evidence removes every stale item for the affected paths', () => {
  const previous: Evidence[] = [
    { evidenceId: 'old-index', sourcePath: 'src/index.ts', locator: '全文', observation: 'old', status: 'confirmed', redactionState: 'clean' },
    { evidenceId: 'old-index-search', sourcePath: 'src/index.ts', locator: '第 1 行', observation: 'old search', status: 'inferred', redactionState: 'clean' },
    { evidenceId: 'keep', sourcePath: 'src/server.ts', locator: '全文', observation: 'keep', status: 'confirmed', redactionState: 'clean' },
    { evidenceId: 'deleted', sourcePath: 'src/deleted.ts', locator: '全文', observation: 'deleted', status: 'confirmed', redactionState: 'clean' },
  ]
  const replacement: Evidence = { evidenceId: 'new-index', sourcePath: 'src/index.ts', locator: '全文（已脱敏）', observation: 'new', status: 'confirmed', redactionState: 'redacted' }

  const result = replaceEvidenceForPaths(previous, [replacement], ['src/index.ts', 'src/deleted.ts'])
  assert.deepEqual(result.map((item) => item.evidenceId), ['keep', 'new-index'])
})
