import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CANDIDATE_VERSION,
  EXISTING_TAG_REVISION,
  GITHUB_ABOUT_METADATA,
  evaluateReleaseContract,
} from '../scripts/release-contract.mjs'

const baseFixture = {
  packageMetadata: { version: CANDIDATE_VERSION, private: true, license: 'MIT' },
  changelogText: `## [${CANDIDATE_VERSION}] - Unreleased candidate`,
  readmeText: [
    `The current reviewed source candidate is \`${CANDIDATE_VERSION}\` and remains unreleased.`,
    `当前审阅中的源码候选版本是 \`${CANDIDATE_VERSION}\`，尚未发布。`,
    `The immutable \`v0.1.0\` tag points to the earlier revision \`${EXISTING_TAG_REVISION}\``,
    `不可变的 \`v0.1.0\` tag 指向较早的 revision \`${EXISTING_TAG_REVISION}\``,
    'No compiled `dist/` distribution is promised.',
    '当前不声称 `0.1.1` 候选版本已有 GitHub Release。',
  ].join('\n'),
  releaseProcessText: [
    `package version \`${CANDIDATE_VERSION}\``,
    `\`${CANDIDATE_VERSION}\` as the next reviewed source-first candidate`,
    GITHUB_ABOUT_METADATA.description,
    GITHUB_ABOUT_METADATA.homepage,
    ...GITHUB_ABOUT_METADATA.topics,
    'not npm publication',
    'do not update them',
  ].join('\n'),
  checklistText: `\`${CANDIDATE_VERSION}\` as the next reviewed source-first candidate`,
  existingTagRevision: EXISTING_TAG_REVISION,
  candidateTagRevision: undefined,
}

test('release contract accepts an aligned immutable historical tag and unreleased candidate', () => {
  const result = evaluateReleaseContract(baseFixture)
  assert.equal(result.status, 'ready')
  assert.deepEqual(result.blockers, [])
})

test('release contract blocks a drifted historical tag or an already-created candidate tag', () => {
  const result = evaluateReleaseContract({
    ...baseFixture,
    existingTagRevision: 'different-revision',
    candidateTagRevision: 'candidate-revision',
  })
  assert.equal(result.status, 'blocked')
  assert.ok(result.blockers.includes('existing-tag-missing-or-drifted'))
  assert.ok(result.blockers.includes('candidate-tag-already-created'))
})

test('release contract blocks stale bilingual or metadata claims', () => {
  const result = evaluateReleaseContract({
    ...baseFixture,
    readmeText: 'old release wording',
    releaseProcessText: 'old release process',
  })
  assert.equal(result.status, 'blocked')
  assert.ok(result.blockers.includes('bilingual-release-status-mismatch'))
  assert.ok(result.blockers.includes('github-about-metadata-handoff-missing'))
  assert.ok(result.blockers.includes('source-first-release-boundary-mismatch'))
})
