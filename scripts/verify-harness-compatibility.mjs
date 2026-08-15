import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'

const repoRoot = resolve(process.cwd())
const harnessRoot = process.env.REPO_ATLAS_HARNESS_ROOT
const manifestPath = join(repoRoot, 'reference', 'harness-compatibility.json')
let dshHome

function assertCondition(condition, message) {
  if (!condition) throw new Error(message)
}

function run(executable, args, options = {}) {
  try {
    return execFileSync(executable, args, {
      cwd: harnessRoot,
      encoding: 'utf8',
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 4 * 1024 * 1024,
      timeout: 120_000,
      ...options,
    })
  } catch (error) {
    const command = [executable, ...args].join(' ')
    const detail = error && typeof error === 'object'
      ? [error.stdout, error.stderr].filter(Boolean).join('\n').trim()
      : ''
    throw new Error(`${command} failed${detail ? `: ${detail.slice(0, 1_000)}` : ''}`)
  }
}

function sanitizedEnvironment() {
  const safe = Object.fromEntries(Object.entries(process.env).filter(([key]) => {
    return !/(?:KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)/i.test(key)
  }))
  return { ...safe, CI: '1', DSH_HOME: dshHome }
}

try {
  assertCondition(typeof harnessRoot === 'string' && isAbsolute(harnessRoot), 'REPO_ATLAS_HARNESS_ROOT must be an absolute path')
  const compatibility = JSON.parse(readFileSync(manifestPath, 'utf8'))
  assertCondition(compatibility.repository === 'https://github.com/deepseek-ai/deepseek-harness.git', 'unexpected Harness repository')
  assertCondition(compatibility.ref === 'master', 'unexpected Harness branch ref')
  assertCondition(compatibility.revision === '47f943859bef60e4160492346772ded9b24f765a', 'unexpected public Harness revision')
  assertCondition(compatibility.profile === 'web', 'unexpected Harness profile')
  assertCondition(compatibility.node === '24.x', 'unexpected Harness Node compatibility pin')
  assertCondition(compatibility.packageManager === 'pnpm@11.7.0', 'unexpected Harness package-manager pin')

  const revision = run('git', ['-C', harnessRoot, 'rev-parse', 'HEAD']).trim()
  assertCondition(revision === compatibility.revision, `Harness checkout is ${revision}, expected the public pin`)

  dshHome = mkdtempSync(join(tmpdir(), 'repo-atlas-harness-smoke-'))
  const environment = sanitizedEnvironment()
  run('pnpm', ['dsh', 'plugin', '--profile', compatibility.profile, 'add', repoRoot], { env: environment })
  const config = run('pnpm', ['dsh', '--profile', compatibility.profile, '--dump-config'], { env: environment })
  assertCondition(config.includes('repo-atlas/harness'), 'composed web profile did not include repo-atlas/harness')
  run('pnpm', ['dsh', 'web', '--help'], { env: environment })

  console.log(`PASS: DeepSeek Harness ${compatibility.revision} ${compatibility.profile} smoke.`)
} catch (error) {
  console.error(`FAIL: DeepSeek Harness compatibility smoke: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
} finally {
  if (dshHome) rmSync(dshHome, { recursive: true, force: true })
}
