import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const repoRoot = resolve(process.cwd())
const checks = []
const blockers = []

function addCheck(id, passed, blocker) {
  checks.push({ id, status: passed ? 'pass' : 'blocked' })
  if (!passed && blocker) blockers.push(blocker)
}

function readText(relativePath, blocker) {
  try {
    return readFileSync(join(repoRoot, relativePath), 'utf8')
  } catch {
    addCheck(`file:${relativePath}`, false, blocker)
    return ''
  }
}

function runGit(args) {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 256 * 1024,
    }).trim()
  } catch {
    return undefined
  }
}

function hasCheckedItem(text, phrase) {
  return text.split('\n').some((line) => /^\s*-\s+\[[xX]\]/.test(line) && line.includes(phrase))
}

const packageText = readText('package.json', 'package-metadata-invalid')
let packageMetadata
try {
  packageMetadata = JSON.parse(packageText)
} catch {
  addCheck('package-metadata', false, 'package-metadata-invalid')
}

if (packageMetadata) {
  const packageContract = packageMetadata.private === true
    && packageMetadata.license === 'MIT'
    && packageMetadata.main === './src/index.ts'
    && packageMetadata.exports?.['.'] === './src/index.ts'
    && packageMetadata.exports?.['./harness'] === './src/harness/plugin.ts'
    && packageMetadata.dsh?.bundle?.patch === './cordis.patch.yml'
  addCheck('source-first-package-contract', packageContract, 'source-first-contract-mismatch')
} else {
  addCheck('source-first-package-contract', false, 'package-metadata-invalid')
}

const license = readText('LICENSE', 'license-document-missing')
const notice = readText('NOTICE.md', 'notice-document-missing')
const supportPolicy = readText('docs/support-policy.md', 'support-policy-missing')
const releaseProcess = readText('docs/release-process.md', 'release-process-missing')
const readme = readText('README.md', 'readme-missing')
const checklist = readText('docs/release-checklist.md', 'release-checklist-missing')

addCheck('mit-license', license.includes('MIT License') && license.includes('Copyright (c) 2026 Zhenkun26'), 'mit-license-mismatch')
addCheck('attribution-notice', notice.includes('RepoAtlas / 代码星图') && notice.includes('github.com/zhenkun26/RepoAtlas'), 'attribution-notice-mismatch')
addCheck('support-policy', Boolean(supportPolicy), 'support-policy-missing')
addCheck('release-process', Boolean(releaseProcess), 'release-process-missing')
addCheck('readme-release-guidance', readme.includes('support-policy.md') && readme.includes('release-process.md'), 'readme-release-guidance-missing')

const changesRoot = join(repoRoot, 'openspec', 'changes')
let activeChangeCount = 0
let openSpecAvailable = true
try {
  activeChangeCount = readdirSync(changesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'archive' && !entry.name.startsWith('.')).length
} catch {
  openSpecAvailable = false
}
addCheck('no-active-openspec-change', openSpecAvailable && activeChangeCount === 0, openSpecAvailable ? 'active-openspec-change' : 'openspec-state-unavailable')

const head = runGit(['rev-parse', '--verify', 'HEAD'])
const branch = runGit(['branch', '--show-current']) || 'detached'
const status = runGit(['status', '--porcelain=v1', '--untracked-files=all'])
addCheck('git-head-available', Boolean(head), 'git-inspection-failed')
addCheck('workspace-clean', status === '', status === undefined ? 'git-inspection-failed' : 'workspace-dirty')

const originMain = runGit(['rev-parse', '--verify', 'origin/main'])
if (!head) blockers.push('head-unavailable')
if (!originMain) {
  addCheck('origin-main-available', false, 'origin-main-unavailable')
} else {
  addCheck('origin-main-current', head === originMain, 'origin-main-drift')
}

const checklistEvidence = [
  ['pinned-harness-smoke', 'Run a pinned real DeepSeek Harness smoke test', 'harness-smoke-pending'],
  ['readme-public-harness-recheck', 'Recheck README installation instructions', 'readme-recheck-pending'],
  ['copyright-holder', 'Confirm the named copyright holder', 'copyright-holder-unconfirmed'],
  ['release-notes', 'Create release notes from the changelog', 'release-notes-pending'],
]
for (const [id, phrase, blocker] of checklistEvidence) addCheck(`checklist:${id}`, hasCheckedItem(checklist, phrase), blocker)

const uniqueBlockers = [...new Set(blockers)]
const result = {
  status: uniqueBlockers.length === 0 ? 'ready' : 'blocked',
  revision: head ?? 'unknown',
  branch,
  checks,
  blockers: uniqueBlockers,
  tagCreated: false,
  releaseCreated: false,
  publishPerformed: false,
  networkAccessed: false,
}

console.log(JSON.stringify(result, null, 2))
if (result.status === 'blocked') process.exitCode = 1
