export declare const CANDIDATE_VERSION: '0.1.1'
export declare const EXISTING_TAG: 'v0.1.0'
export declare const EXISTING_TAG_REVISION: '455dbb61d5cabe032e3497ba4d9eeb9c39584662'

export declare const GITHUB_ABOUT_METADATA: {
  readonly description: string
  readonly homepage: string
  readonly topics: readonly string[]
}

export declare function evaluateReleaseContract(input: {
  packageMetadata: { version?: string; private?: boolean; license?: string } | undefined
  changelogText: string
  readmeText: string
  releaseProcessText: string
  checklistText: string
  existingTagRevision: string | undefined
  candidateTagRevision: string | undefined
}): {
  status: 'ready' | 'blocked'
  checks: Array<{ id: string; status: 'pass' | 'blocked'; blocker?: string }>
  blockers: string[]
}
