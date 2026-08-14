import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createGoalSpec, resolveStart } from '../src/clarification/goal.ts'
import { analyzeRepository } from '../src/repository/analyze.ts'
import { generateReport, exportReportBundle } from '../src/reporting/report.ts'
import { createConfig } from '../src/config.ts'
import { refineAndAnalyze } from '../src/session.ts'
import { addConclusion } from '../src/evidence.ts'

const fixture = (...parts: string[]) => path.join(process.cwd(), 'test', 'fixtures', ...parts)

test('onboarding analysis produces evidence-backed report and structured atlas data', async () => {
  const goal = resolveStart(createGoalSpec({ intent: 'onboarding' }), 'direct')
  const session = await analyzeRepository(goal, fixture('complete-repo'))
  const report = generateReport(session)
  assert.ok(session.scan.files.length > 0)
  assert.ok(session.evidence.length > 0)
  assert.match(report.markdown, /技术栈/)
  assert.match(report.markdown, /证据索引/)
  assert.equal(report.atlas.version, '1')
})

test('architecture analysis only reports static inferred relationships', async () => {
  const goal = resolveStart(createGoalSpec({ intent: 'architecture' }), 'direct')
  const session = await analyzeRepository(goal, fixture('complete-repo'))
  const report = generateReport(session)
  assert.ok(session.actions.some((action) => action.action === 'search'))
  assert.match(report.mermaid, /flowchart TD/)
  assert.ok(report.atlas.limitations.some((item) => item.includes('静态')))
})

test('follow-up analysis reuses evidence and narrows discovery scope', async () => {
  const goal = resolveStart(createGoalSpec({ intent: 'onboarding' }), 'direct')
  const session = await analyzeRepository(goal, fixture('complete-repo'))
  const refined = await refineAndAnalyze(session, { intent: 'architecture', scope: ['src'], confirmed: true })
  assert.equal(refined.workspaceRoot, fixture('complete-repo'))
  assert.ok(refined.evidence.length >= session.evidence.length)
  assert.ok(refined.scan.files.every((file) => file.relativePath.startsWith('src/')))
})

test('report export requires explicit confirmation', async () => {
  const goal = resolveStart(createGoalSpec(), 'direct')
  const session = await analyzeRepository(goal, fixture('complete-repo'))
  const report = generateReport(session)
  const config = createConfig(fixture('complete-repo'))
  const target = fixture('complete-repo', 'repo-atlas-output')
  try {
    const denied = await exportReportBundle(report, config, 'repo-atlas-output', false)
    assert.equal(denied.allowed, false)
    const allowed = await exportReportBundle(report, config, 'repo-atlas-output', true)
    assert.equal(allowed.allowed, true)
  } finally {
    await fs.rm(target, { recursive: true, force: true })
  }
})

test('report downgrades material conclusions that lack evidence', async () => {
  const goal = resolveStart(createGoalSpec(), 'direct')
  const session = await analyzeRepository(goal, fixture('complete-repo'))
  addConclusion(session.conclusions, '这条结论没有证据。', 'confirmed', [])
  const report = generateReport(session)
  assert.match(report.markdown, /报告降级为不确定/)
  assert.match(report.markdown, /\*\*未确认\*\* 这条结论没有证据/)
})
