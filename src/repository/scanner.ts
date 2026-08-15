import fs from 'node:fs/promises'
import path from 'node:path'
import { createConfig } from '../config.ts'
import { redactSecretLike, isSensitivePath } from '../safety/content-policy.ts'
import { decideAction, auditDecision } from '../safety/policy-gate.ts'
import { assertWorkspacePath, checkWorkspacePath } from '../safety/path-policy.ts'
import type { AuditEvent, EvidenceFingerprint, ReadResult, RepoAtlasConfig, ScanResult, ScannedFile, ToolAction } from '../types.ts'

export class RepositoryScanner {
  readonly config: RepoAtlasConfig
  private readonly scanned: ScannedFile[] = []
  private readonly skipped: Array<{ path: string; reason: string }> = []
  private readonly failures: Array<{ path: string; reason: string }> = []
  private readonly audits: AuditEvent[] = []
  private readBytes = 0
  private actionCount = 0
  private candidateFiles = 0
  private exhausted = false

  constructor(workspaceRoot: string, overrides: Partial<Omit<RepoAtlasConfig, 'workspaceRoot'>> = {}) {
    this.config = createConfig(workspaceRoot, overrides)
  }

  async discover(signal?: AbortSignal): Promise<ScanResult> {
    for (const scope of this.config.scope ?? ['.']) {
      if (signal?.aborted || this.exhausted) break
      await this.walk(scope, signal)
    }
    return this.snapshot()
  }

  async readText(relativePath: string, signal?: AbortSignal): Promise<ReadResult> {
    if (signal?.aborted) return this.interrupted(relativePath)
    const decision = this.beginAction('read', relativePath)
    if (!decision.allowed) return this.deniedRead(relativePath, decision.reason)
    const absolutePath = assertWorkspacePath(this.config.workspaceRoot, relativePath)
    const normalized = normalizeRelative(this.config.workspaceRoot, absolutePath)
    if (isSensitivePath(normalized, this.config.sensitiveFilePatterns)) return this.deniedRead(normalized, 'sensitive path is denied')
    let stat
    try {
      stat = await fs.stat(absolutePath)
    } catch (error) {
      return this.failedRead(normalized, errorMessage(error))
    }
    if (!stat.isFile()) return this.failedRead(normalized, 'not a regular file')
    if (stat.size > this.config.maxFileBytes) {
      this.skip(normalized, 'file exceeds maxFileBytes')
      return { relativePath: normalized, status: 'budget-exhausted', redacted: false, reason: 'file exceeds maxFileBytes', sizeBytes: stat.size }
    }
    if (this.readBytes + stat.size > this.config.maxTotalBytes) {
      this.exhausted = true
      this.skip(normalized, 'total read budget exhausted')
      return { relativePath: normalized, status: 'budget-exhausted', redacted: false, reason: 'total read budget exhausted', sizeBytes: stat.size }
    }
    try {
      const buffer = await fs.readFile(absolutePath)
      this.readBytes += buffer.byteLength
      if (signal?.aborted) return this.interrupted(normalized)
      if (looksBinary(buffer)) {
        this.skip(normalized, 'binary file')
        return { relativePath: normalized, status: 'safety-skipped', redacted: false, reason: 'binary file', sizeBytes: stat.size }
      }
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
      const redacted = redactSecretLike(decoded)
      return {
        relativePath: normalized,
        status: 'confirmed',
        text: redacted.text,
        redacted: redacted.redacted,
        sizeBytes: stat.size,
      }
    } catch (error) {
      return this.failedRead(normalized, errorMessage(error))
    }
  }

  async search(query: string, relativePaths?: string[], signal?: AbortSignal, providedText?: ReadonlyMap<string, string>, observedText?: Map<string, string>, readPaths?: Set<string>): Promise<Array<{ path: string; line: number; text: string }>> {
    const decision = this.beginAction('search', relativePaths?.[0] ?? '.')
    if (!decision.allowed) return []
    const pattern = new RegExp(query, 'i')
    const paths = relativePaths ?? this.scanned.filter((file) => file.kind === 'text').map((file) => file.relativePath)
    const matches: Array<{ path: string; line: number; text: string }> = []
    for (const candidate of paths) {
      if (signal?.aborted) break
      let text: string | undefined
      if (providedText?.has(candidate)) {
        text = providedText.get(candidate)
      } else {
        const read = await this.readText(candidate, signal)
        readPaths?.add(candidate)
        text = read.text
        if (text !== undefined) observedText?.set(candidate, text)
      }
      if (!text) continue
      text.split('\n').forEach((line, index) => {
        if (pattern.test(line)) matches.push({ path: candidate, line: index + 1, text: line.slice(0, 500) })
      })
    }
    return matches
  }

  async parseConfig(relativePath: string, signal?: AbortSignal, providedText?: string): Promise<{ path: string; format: string; values: Record<string, unknown>; status: string }> {
    const decision = this.beginAction('parse-config', relativePath)
    if (!decision.allowed) return { path: relativePath, format: 'unknown', values: {}, status: 'safety-skipped' }
    const read = providedText === undefined ? await this.readText(relativePath, signal) : { text: providedText, status: 'confirmed' as const }
    if (!read.text) return { path: relativePath, format: 'unknown', values: {}, status: read.status }
    const extension = path.extname(relativePath).toLowerCase()
    try {
      if (path.basename(relativePath).toLowerCase() === 'package.json' || extension === '.json') {
        const parsed = JSON.parse(read.text) as Record<string, unknown>
        return { path: relativePath, format: 'json', values: summarizeConfig(parsed), status: 'confirmed' }
      }
      if (['.toml', '.yaml', '.yml'].includes(extension)) {
        return { path: relativePath, format: extension.slice(1), values: summarizeLineConfig(read.text), status: 'inferred' }
      }
      if (path.basename(relativePath).toLowerCase() === 'go.mod') {
        const module = read.text.match(/^module\s+(.+)$/m)?.[1]?.trim()
        return { path: relativePath, format: 'go.mod', values: module ? { module } : {}, status: module ? 'confirmed' : 'unconfirmed' }
      }
      return { path: relativePath, format: 'text', values: {}, status: 'unconfirmed' }
    } catch (error) {
      this.failures.push({ path: relativePath, reason: `config parse failed: ${errorMessage(error)}` })
      this.audits.push({ auditId: `failure-${crypto.randomUUID()}`, timestamp: new Date().toISOString(), action: 'failure', status: 'failed', path: relativePath, reason: 'config parse failed', detail: errorMessage(error) })
      return { path: relativePath, format: extension.slice(1) || 'text', values: {}, status: 'read-failed' }
    }
  }

  snapshot(): ScanResult {
    return {
      files: [...this.scanned],
      skipped: [...this.skipped],
      failures: [...this.failures],
      audits: [...this.audits],
      budget: { candidateFiles: this.candidateFiles, readBytes: this.readBytes, actions: this.actionCount, exhausted: this.exhausted },
    }
  }

  private async walk(relativeDir: string, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted || this.exhausted) return
    const absoluteDir = assertWorkspacePath(this.config.workspaceRoot, relativeDir)
    let entries
    try {
      entries = await fs.readdir(absoluteDir, { withFileTypes: true })
    } catch (error) {
      this.failures.push({ path: relativeDir, reason: errorMessage(error) })
      return
    }
    for (const entry of entries) {
      if (signal?.aborted || this.exhausted) return
      const relativePath = normalizeRelative(this.config.workspaceRoot, path.join(absoluteDir, entry.name))
      if (entry.isDirectory()) {
        if (this.config.excludeDirs.includes(entry.name) || this.config.excludeDirs.some((excluded) => relativePath === excluded || relativePath.startsWith(`${excluded}/`))) {
          this.skip(relativePath, 'excluded directory')
          continue
        }
        await this.walk(relativePath, signal)
        continue
      }
      if (entry.isSymbolicLink()) {
        const check = checkWorkspacePath(this.config.workspaceRoot, relativePath)
        this.skip(relativePath, check.allowed ? 'symbolic link skipped by default' : 'external symbolic link denied')
        continue
      }
      this.candidateFiles += 1
      if (this.candidateFiles > this.config.maxCandidateFiles) {
        this.exhausted = true
        this.skip(relativePath, 'candidate file budget exhausted')
        this.audits.push({ auditId: `budget-${crypto.randomUUID()}`, timestamp: new Date().toISOString(), action: 'budget', status: 'skipped', path: relativePath, reason: 'candidate file budget exhausted' })
        return
      }
      if (isSensitivePath(relativePath, this.config.sensitiveFilePatterns)) {
        this.scanned.push({ relativePath, sizeBytes: 0, kind: 'sensitive' })
        this.skip(relativePath, 'sensitive path')
        continue
      }
      try {
        const stat = await fs.stat(path.join(absoluteDir, entry.name))
        const kind = stat.size > this.config.maxFileBytes ? 'too-large' : 'text'
        const fingerprint = createFingerprint(relativePath, stat)
        this.scanned.push({ relativePath, sizeBytes: stat.size, kind, fingerprint })
        if (kind === 'too-large') this.skip(relativePath, 'file exceeds maxFileBytes')
      } catch (error) {
        this.scanned.push({ relativePath, sizeBytes: 0, kind: 'unreadable' })
        this.failures.push({ path: relativePath, reason: errorMessage(error) })
      }
    }
  }

  private beginAction(action: ToolAction, relativePath: string) {
    if (this.actionCount >= this.config.maxActions) {
      this.exhausted = true
      const decision = decideAction(this.config, action, relativePath)
      this.audits.push({ ...auditDecision(decision, 'ReAct action budget exhausted'), action: 'budget', status: 'skipped', reason: 'ReAct action budget exhausted' })
      return { ...decision, allowed: false, reason: 'ReAct action budget exhausted' }
    }
    this.actionCount += 1
    const decision = decideAction(this.config, action, relativePath)
    this.audits.push(auditDecision(decision))
    return decision
  }

  private deniedRead(relativePath: string, reason: string): ReadResult {
    this.skip(relativePath, reason)
    return { relativePath, status: 'safety-skipped', redacted: false, reason }
  }

  private failedRead(relativePath: string, reason: string): ReadResult {
    this.failures.push({ path: relativePath, reason })
    return { relativePath, status: 'read-failed', redacted: false, reason }
  }

  private interrupted(relativePath: string): ReadResult {
    this.skip(relativePath, 'user interrupted analysis')
    return { relativePath, status: 'interrupted', redacted: false, reason: 'user interrupted analysis' }
  }

  private skip(relativePath: string, reason: string): void {
    this.skipped.push({ path: relativePath, reason })
    this.audits.push({ auditId: `skip-${crypto.randomUUID()}`, timestamp: new Date().toISOString(), action: 'skip', status: 'skipped', path: relativePath, reason })
  }
}

function createFingerprint(relativePath: string, stat: { size: number; mtimeMs: number; ctimeMs: number }): EvidenceFingerprint | undefined {
  if (![stat.size, stat.mtimeMs, stat.ctimeMs].every(Number.isFinite)) return undefined
  return { relativePath, sizeBytes: stat.size, mtimeMs: stat.mtimeMs, ctimeMs: stat.ctimeMs }
}

function normalizeRelative(root: string, absolutePath: string): string {
  return path.relative(root, absolutePath).split(path.sep).join('/') || '.'
}

function looksBinary(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8_192))
  if (sample.includes(0)) return true
  let control = 0
  for (const byte of sample) {
    if (byte < 7 || (byte > 14 && byte < 32)) control += 1
  }
  return sample.length > 0 && control / sample.length > 0.1
}

function summarizeConfig(input: Record<string, unknown>): Record<string, unknown> {
  const keys = ['name', 'version', 'private', 'type', 'main', 'module', 'bin', 'scripts', 'dependencies', 'devDependencies', 'engines']
  return Object.fromEntries(keys.filter((key) => key in input).map((key) => [key, input[key]]))
}

function summarizeLineConfig(text: string): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const line of text.split('\n')) {
    const match = line.match(/^\s*([A-Za-z0-9_.-]+)\s*[:=]\s*["']?([^"'#]+)["']?\s*$/)
    if (match) values[match[1]] = redactSecretLike(match[2].trim()).text.slice(0, 200)
  }
  return values
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
