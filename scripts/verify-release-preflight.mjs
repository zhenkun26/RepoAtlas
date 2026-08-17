import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import {
  CANDIDATE_VERSION,
  EXISTING_TAG,
  evaluateReleaseContract,
} from './release-contract.mjs'

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
    && packageMetadata.main === './dist/index.js'
    && packageMetadata.types === './dist/index.d.ts'
    && packageMetadata.exports?.['.']?.default === './dist/index.js'
    && packageMetadata.exports?.['.']?.types === './dist/index.d.ts'
    && packageMetadata.exports?.['./harness']?.default === './dist/harness/plugin.js'
    && packageMetadata.exports?.['./harness']?.types === './dist/harness/plugin.d.ts'
    && JSON.stringify(packageMetadata.files) === JSON.stringify(['dist/', 'cordis.patch.yml', 'README.md', 'LICENSE', 'NOTICE.md'])
    && packageMetadata.dsh?.bundle?.patch === './cordis.patch.yml'
  addCheck('built-private-package-contract', packageContract, 'built-private-contract-mismatch')
} else {
  addCheck('built-private-package-contract', false, 'package-metadata-invalid')
}

const license = readText('LICENSE', 'license-document-missing')
const notice = readText('NOTICE.md', 'notice-document-missing')
const supportPolicy = readText('docs/support-policy.md', 'support-policy-missing')
const releaseProcess = readText('docs/release-process.md', 'release-process-missing')
const readme = readText('README.md', 'readme-missing')
const checklist = readText('docs/release-checklist.md', 'release-checklist-missing')
const changelog = readText('CHANGELOG.md', 'changelog-missing')

addCheck('mit-license', license.includes('MIT License') && license.includes('Copyright (c) 2026 Zhenkun26'), 'mit-license-mismatch')
addCheck('attribution-notice', notice.includes('RepoAtlas / 代码星图') && notice.includes('github.com/zhenkun26/dsh-repo-atlas'), 'attribution-notice-mismatch')
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

const existingTagRevision = runGit(['rev-parse', '--verify', `refs/tags/${EXISTING_TAG}^{commit}`])
const candidateTagRevision = runGit(['rev-parse', '--verify', `refs/tags/v${CANDIDATE_VERSION}^{commit}`])
const releaseContract = evaluateReleaseContract({
  packageMetadata,
  changelogText: changelog,
  readmeText: readme,
  releaseProcessText: releaseProcess,
  checklistText: checklist,
  existingTagRevision,
  candidateTagRevision,
})
for (const check of releaseContract.checks) addCheck(`release-contract:${check.id}`, check.status === 'pass', check.blocker)

const uniqueBlockers = [...new Set(blockers)]
const result = {
  status: uniqueBlockers.length === 0 ? 'ready' : 'blocked',
  revision: head ?? 'unknown',
  branch,
  candidateVersion: CANDIDATE_VERSION,
  existingTag: { name: EXISTING_TAG, revision: existingTagRevision ?? 'unknown' },
  candidateTag: { name: `v${CANDIDATE_VERSION}`, revision: candidateTagRevision ?? 'not-created' },
  checks,
  blockers: uniqueBlockers,
  tagCreated: false,
  releaseCreated: false,
  publishPerformed: false,
  networkAccessed: false,
  remoteReleaseObserved: false,
  remoteMetadataMutationPerformed: false,
}

console.log(JSON.stringify(result, null, 2))
if (result.status === 'blocked') process.exitCode = 1
