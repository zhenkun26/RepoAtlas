import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { createAnalysisPlan } from './plan.ts'
import { RepositoryScanner } from './scanner.ts'
import { createConfig } from '../config.ts'
import { createEvidence, addConclusion } from '../evidence.ts'
import type { AnalysisSession, ArchitectureEdge, Conclusion, Evidence, GoalSpec, RepoAtlasConfig, ReActActionRecord } from '../types.ts'

export async function analyzeRepository(goal: GoalSpec, workspaceRoot: string, overrides: Partial<Omit<RepoAtlasConfig, 'workspaceRoot'>> = {}, signal?: AbortSignal, reusedEvidence: Evidence[] = []): Promise<AnalysisSession> {
  if (!goal.confirmed) throw new Error('GoalSpec must be confirmed before deep analysis')
  const config = createConfig(workspaceRoot, overrides)
  const scanner = new RepositoryScanner(config.workspaceRoot, { ...overrides, scope: goal.scope?.length ? goal.scope : overrides.scope })
  const plan = createAnalysisPlan(goal)
  const sessionId = `session-${randomUUID()}`
  const evidence: Evidence[] = [...reusedEvidence]
  const actions: ReActActionRecord[] = []
  const conclusions: Conclusion[] = []
  const edges: ArchitectureEdge[] = []
  let interrupted = false

  const scanBefore = await scanner.discover(signal)
  addAction(actions, 'list', '.', '列举 workspace 文件', scanBefore.files.length ? `发现 ${scanBefore.files.length} 个候选文件` : '未发现可分析文件', [], scanBefore.budget.exhausted ? 'budget-exhausted' : 'confirmed')
  evidence.push(createEvidence('workspace', '.', `发现 ${scanBefore.files.length} 个候选文件；跳过 ${scanBefore.skipped.length} 个路径`, scanBefore.budget.exhausted ? 'budget-exhausted' : 'confirmed'))

  const readableConfigPaths = scanBefore.files
    .filter((file) => !file.relativePath.includes('/') && ['package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod', 'README.md', 'tsconfig.json', 'vite.config.ts', 'vitest.config.ts', 'jest.config.js'].includes(file.relativePath))
    .map((file) => file.relativePath)
  const targetPaths = new Set(readableConfigPaths)
  for (const step of plan.steps.filter((step) => step.action === 'read')) targetPaths.add(step.target)

  for (const target of targetPaths) {
    if (signal?.aborted) { interrupted = true; break }
    const result = await scanner.readText(target, signal)
    const status = result.status
    addAction(actions, 'read', target, `读取 ${target}`, result.reason ?? (result.text ? `读取 ${result.text.length} 个字符` : '无文本内容'), [], status)
    evidence.push(createEvidence(target, '全文（已脱敏）', result.text ? result.text.slice(0, 8000) : result.reason ?? '未读取', status, result.redacted))
  }

  const parsedConfigs = await parseConfigs(scanner, readableConfigPaths, signal)
  const project = inferProject(config.workspaceRoot, scanBefore.files, parsedConfigs, evidence)
  addConclusion(conclusions, `项目可从 ${project.entries.length ? project.entries.join('、') : '未确认的入口线索'} 开始阅读。`, project.entries.length ? 'inferred' : 'unconfirmed', evidence.filter((item) => project.entries.includes(item.sourcePath)).map((item) => item.evidenceId))
  if (project.techStack.length) addConclusion(conclusions, `检测到技术栈线索：${project.techStack.join('、')}。`, 'inferred', evidence.filter((item) => ['package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod'].includes(item.sourcePath)).map((item) => item.evidenceId))

  const searchTerms = plan.steps.filter((step) => step.action === 'search')
  const searchPaths = scanBefore.files
    .filter((file) => /\.(?:[cm]?[jt]sx?|py|go|rs)$/.test(file.relativePath) && file.kind === 'text')
    .map((file) => file.relativePath)
    .slice(0, 40)
  for (const step of searchTerms) {
    if (signal?.aborted) { interrupted = true; break }
    const matches = await scanner.search(step.target, searchPaths, signal)
    const ids: string[] = []
    for (const match of matches.slice(0, 50)) {
      const item = createEvidence(match.path, `第 ${match.line} 行`, match.text, 'inferred')
      evidence.push(item)
      ids.push(item.evidenceId)
    }
    addAction(actions, 'search', step.target, step.purpose, `找到 ${matches.length} 条线索`, ids, matches.length ? 'inferred' : 'unconfirmed')
  }

  if (plan.name === 'architecture') {
    edges.push(...inferEdges(scanBefore.files, evidence))
    if (edges.length) addConclusion(conclusions, `已从静态文本中推断 ${edges.length} 条模块关系；未执行代码，因此关系仍需人工确认。`, 'inferred', edges.flatMap((edge) => edge.evidenceIds))
  }

  const scan = scanner.snapshot()
  if (scan.budget.exhausted) addConclusion(conclusions, '分析触及资源预算，以上结果是部分结果。', 'budget-exhausted', [evidence[0]?.evidenceId].filter(Boolean) as string[])
  if (interrupted) addConclusion(conclusions, '用户中断了分析，以上结果保留已完成部分。', 'interrupted', [])
  return { sessionId, workspaceRoot: config.workspaceRoot, goal, plan, scan, evidence, conclusions, actions, edges, project, interrupted }
}

async function parseConfigs(scanner: RepositoryScanner, paths: string[], signal?: AbortSignal): Promise<Array<{ path: string; values: Record<string, unknown> }>> {
  const results = []
  for (const file of paths.filter((item) => item !== 'README.md')) {
    if (signal?.aborted) break
    const result = await scanner.parseConfig(file, signal)
    if (Object.keys(result.values).length) results.push({ path: result.path, values: result.values })
  }
  return results
}

function inferProject(workspaceRoot: string, files: AnalysisSession['scan']['files'], configs: Array<{ path: string; values: Record<string, unknown> }>, evidence: Evidence[]): AnalysisSession['project'] {
  const paths = files.map((file) => file.relativePath)
  const dirs = [...new Set(paths.filter((item) => item.includes('/')).map((item) => item.split('/')[0]))].slice(0, 20)
  const techStack: string[] = []
  if (configs.some((item) => item.path === 'package.json')) techStack.push('Node.js / JavaScript')
  if (configs.some((item) => item.path.endsWith('.ts') || item.path === 'tsconfig.json')) techStack.push('TypeScript')
  if (configs.some((item) => item.path === 'pyproject.toml')) techStack.push('Python')
  if (configs.some((item) => item.path === 'go.mod')) techStack.push('Go')
  if (configs.some((item) => item.path === 'Cargo.toml')) techStack.push('Rust')
  const entries = evidence.filter((item) => /(^|\/)(main|index|app|server|cli)(\.[^.]+)?$/.test(item.sourcePath)).map((item) => item.sourcePath).slice(0, 10)
  const runtimeConfig = paths.filter((item) => /(^|\/)(package\.json|pyproject\.toml|Cargo\.toml|go\.mod|tsconfig\.json|vite\.config\.|next\.config\.)/.test(item)).slice(0, 20)
  const testConfig = paths.filter((item) => /(jest|vitest|pytest|test|spec|coverage)/i.test(item)).slice(0, 20)
  const readingOrder = [...new Set(['README.md', ...runtimeConfig, ...entries, ...dirs.map((dir) => `${dir}/`)].filter((item) => item === 'README.md' || paths.includes(item) || item.endsWith('/')))].slice(0, 20)
  return {
    name: String(configs.find((item) => item.path === 'package.json')?.values.name ?? path.basename(workspaceRoot)),
    summary: '基于本地静态文件和配置的只读分析摘要。',
    techStack,
    entries,
    coreDirectories: dirs,
    runtimeConfig,
    testConfig,
    readingOrder,
  }
}

function inferEdges(files: AnalysisSession['scan']['files'], evidence: Evidence[]): ArchitectureEdge[] {
  const sourceFiles = files.filter((file) => file.kind === 'text' && /\.(?:[cm]?[jt]s|tsx?|jsx?|py|go|rs)$/.test(file.relativePath)).map((file) => file.relativePath)
  const edges: ArchitectureEdge[] = []
  for (const source of sourceFiles) {
    const sourceEvidence = evidence.filter((item) => item.sourcePath === source)
    const observation = sourceEvidence.map((item) => item.observation).join('\n')
    const imports = [...observation.matchAll(/(?:from|import|require\s*\(|include\s+)["'`]?([@A-Za-z0-9_./-]+)/g)].map((match) => match[1])
    for (const imported of imports.slice(0, 20)) {
      const target = resolveLocalTarget(source, imported, sourceFiles)
      if (!target) continue
      edges.push({ from: source, to: target, relation: 'imports', evidenceIds: sourceEvidence.map((item) => item.evidenceId), status: 'inferred' })
    }
  }
  return dedupeEdges(edges)
}

function resolveLocalTarget(source: string, imported: string, files: string[]): string | undefined {
  if (!imported.startsWith('.')) return undefined
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(source), imported))
  return files.find((file) => file === base || file.startsWith(`${base}.`) || file.startsWith(`${base}/`))
}

function dedupeEdges(edges: ArchitectureEdge[]): ArchitectureEdge[] {
  return [...new Map(edges.map((edge) => [`${edge.from}->${edge.to}`, edge])).values()]
}

function addAction(actions: ReActActionRecord[], action: ReActActionRecord['action'], input: string, thought: string, observation: string, evidenceIds: string[], status: ReActActionRecord['status']): void {
  actions.push({ actionId: `action-${randomUUID()}`, thought, action, input, observation, status, evidenceIds })
}
