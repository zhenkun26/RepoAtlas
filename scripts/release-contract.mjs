export const CANDIDATE_VERSION = '0.1.1'
export const EXISTING_TAG = 'v0.1.0'
export const EXISTING_TAG_REVISION = '455dbb61d5cabe032e3497ba4d9eeb9c39584662'

export const GITHUB_ABOUT_METADATA = Object.freeze({
  description: 'Safety-first, evidence-backed repository analysis and bounded change-lifecycle plugin for DeepSeek Harness.',
  homepage: 'https://github.com/zhenkun26/RepoAtlas#readme',
  topics: Object.freeze([
    'deepseek-harness',
    'dsh',
    'dsh-plugin',
    'ai-coding',
    'code-analysis',
    'repository-analysis',
    'typescript',
    'developer-tools',
    'safety',
  ]),
})

function hasAll(text, fragments) {
  return fragments.every((fragment) => text.includes(fragment))
}

export function evaluateReleaseContract({
  packageMetadata,
  changelogText,
  readmeText,
  releaseProcessText,
  checklistText,
  existingTagRevision,
  candidateTagRevision,
}) {
  const checks = []
  const blockers = []

  function addCheck(id, passed, blocker) {
    checks.push({ id, status: passed ? 'pass' : 'blocked', blocker: passed ? undefined : blocker })
    if (!passed && blocker) blockers.push(blocker)
  }

  addCheck(
    'candidate-version',
    packageMetadata?.version === CANDIDATE_VERSION
      && changelogText.includes(`## [${CANDIDATE_VERSION}] - Unreleased candidate`)
      && releaseProcessText.includes(`package version \`${CANDIDATE_VERSION}\``)
      && checklistText.includes(`\`${CANDIDATE_VERSION}\` as the next reviewed source-first candidate`),
    'candidate-version-mismatch',
  )
  addCheck(
    'immutable-existing-tag',
    existingTagRevision === EXISTING_TAG_REVISION,
    'existing-tag-missing-or-drifted',
  )
  addCheck(
    'candidate-tag-not-created',
    candidateTagRevision === undefined,
    'candidate-tag-already-created',
  )
  addCheck(
    'bilingual-release-status',
    hasAll(readmeText, [
      `The current reviewed source candidate is \`${CANDIDATE_VERSION}\` and remains unreleased.`,
      `当前审阅中的源码候选版本是 \`${CANDIDATE_VERSION}\`，尚未发布。`,
      `The immutable \`${EXISTING_TAG}\` tag points to the earlier revision \`${EXISTING_TAG_REVISION}\``,
      `不可变的 \`${EXISTING_TAG}\` tag 指向较早的 revision \`${EXISTING_TAG_REVISION}\``,
    ]),
    'bilingual-release-status-mismatch',
  )
  addCheck(
    'github-about-metadata-handoff',
    hasAll(releaseProcessText, [
      GITHUB_ABOUT_METADATA.description,
      GITHUB_ABOUT_METADATA.homepage,
      ...GITHUB_ABOUT_METADATA.topics,
      'do not update them',
    ]),
    'github-about-metadata-handoff-missing',
  )
  addCheck(
    'source-first-boundary',
    packageMetadata?.private === true
      && packageMetadata?.license === 'MIT'
      && readmeText.includes('No compiled `dist/` distribution is promised.')
      && readmeText.includes('当前不声称 `0.1.1` 候选版本已有 GitHub Release。')
      && releaseProcessText.includes('not npm publication'),
    'source-first-release-boundary-mismatch',
  )

  return {
    status: blockers.length === 0 ? 'ready' : 'blocked',
    checks,
    blockers: [...new Set(blockers)],
  }
}
