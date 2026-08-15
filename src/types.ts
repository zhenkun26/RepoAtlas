export type GoalIntent = 'onboarding' | 'architecture' | 'custom'

export type AnalysisStatus =
  | 'confirmed'
  | 'inferred'
  | 'unconfirmed'
  | 'not-analyzed'
  | 'read-failed'
  | 'safety-skipped'
  | 'budget-exhausted'
  | 'interrupted'

export interface GoalSpec {
  intent?: GoalIntent
  audience?: string
  scope?: string[]
  outputs?: string[]
  permissions: string[]
  success_criteria?: string[]
  confirmed: boolean
}

export interface RepoAtlasConfig {
  workspaceRoot: string
  scope?: string[]
  excludeDirs: string[]
  sensitiveFilePatterns: string[]
  maxCandidateFiles: number
  maxFileBytes: number
  maxTotalBytes: number
  maxActions: number
  controlledActions: ControlledActionsConfig
}

export type ControlledActionSandboxMode = 'read-only' | 'workspace-write'

export interface ControlledActionRecipe {
  id: string
  command: string
  args: string[]
  sandboxMode: ControlledActionSandboxMode
  timeoutMs: number
  maxOutputBytes: number
  enabled: boolean
}

export interface ControlledActionsConfig {
  enabled: boolean
  recipes: ControlledActionRecipe[]
}

export type ToolAction =
  | 'list'
  | 'read'
  | 'search'
  | 'parse-config'
  | 'write'
  | 'delete'
  | 'rename'
  | 'shell'
  | 'network'
  | 'install'
  | 'git-push'
  | 'external-service'
  | 'export-report'

export interface PolicyDecision {
  allowed: boolean
  action: ToolAction
  reason: string
  path?: string
  auditId: string
}

export interface AuditEvent {
  auditId: string
  timestamp: string
  action: ToolAction | 'skip' | 'failure' | 'budget'
  status: 'allowed' | 'denied' | 'skipped' | 'failed'
  path?: string
  reason: string
  detail?: string
}

export interface Evidence {
  evidenceId: string
  sourcePath: string
  locator: string
  observation: string
  status: AnalysisStatus
  redactionState: 'clean' | 'redacted' | 'not-applicable'
}

export const EVIDENCE_CACHE_SCHEMA_VERSION = 1 as const

export interface EvidenceFingerprint {
  relativePath: string
  sizeBytes: number
  mtimeMs: number
  ctimeMs: number
}

export interface EvidenceCacheEntry {
  fingerprint: EvidenceFingerprint
  coverage: string[]
  evidence: Evidence[]
}

export interface EvidenceCache {
  schemaVersion: typeof EVIDENCE_CACHE_SCHEMA_VERSION
  workspaceRoot: string
  policyFingerprint: string
  entries: EvidenceCacheEntry[]
}

export interface IncrementalEvidenceSummary {
  mode: 'full' | 'incremental'
  reused: string[]
  invalidated: string[]
  reread: string[]
  new: string[]
  uncovered: string[]
}

export interface Conclusion {
  conclusionId: string
  text: string
  status: AnalysisStatus
  evidenceIds: string[]
}

export interface ReActActionRecord {
  actionId: string
  thought: string
  action: ToolAction
  input: string
  observation: string
  status: AnalysisStatus
  evidenceIds: string[]
}

export interface ScannedFile {
  relativePath: string
  sizeBytes: number
  kind: 'text' | 'binary' | 'too-large' | 'sensitive' | 'unreadable'
  fingerprint?: EvidenceFingerprint
}

export interface ScanResult {
  files: ScannedFile[]
  skipped: Array<{ path: string; reason: string }>
  failures: Array<{ path: string; reason: string }>
  audits: AuditEvent[]
  budget: {
    candidateFiles: number
    readBytes: number
    actions: number
    exhausted: boolean
  }
}

export interface ReadResult {
  relativePath: string
  status: AnalysisStatus
  text?: string
  redacted: boolean
  reason?: string
  sizeBytes?: number
}

export interface ArchitectureEdge {
  from: string
  to: string
  relation: 'imports' | 'references' | 'configures'
  evidenceIds: string[]
  status: AnalysisStatus
}

export interface AnalysisPlan {
  name: 'onboarding' | 'architecture'
  steps: Array<{
    action: Extract<ToolAction, 'list' | 'read' | 'search' | 'parse-config'>
    target: string
    purpose: string
  }>
}

export interface AnalysisSession {
  sessionId: string
  workspaceRoot: string
  goal: GoalSpec
  plan: AnalysisPlan
  scan: ScanResult
  evidence: Evidence[]
  conclusions: Conclusion[]
  actions: ReActActionRecord[]
  edges: ArchitectureEdge[]
  project: {
    name: string
    summary: string
    techStack: string[]
    entries: string[]
    coreDirectories: string[]
    runtimeConfig: string[]
    testConfig: string[]
    readingOrder: string[]
  }
  interrupted: boolean
  evidenceCache?: EvidenceCache
  incrementalSummary?: IncrementalEvidenceSummary
}

export interface AtlasData {
  version: '1'
  sessionId: string
  project: AnalysisSession['project']
  nodes: Array<{ id: string; label: string; kind: 'file' | 'directory' | 'config'; status: AnalysisStatus }>
  edges: ArchitectureEdge[]
  conclusions: Conclusion[]
  evidence: Evidence[]
  limitations: string[]
}

export interface AnalysisReport {
  sessionId: string
  markdown: string
  mermaid: string
  atlas: AtlasData
  exportable: boolean
  incrementalSummary?: IncrementalEvidenceSummary
}
