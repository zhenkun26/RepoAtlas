import path from 'node:path'
import type { RepoAtlasConfig } from '../types.ts'

const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /\b(?:sk-[A-Za-z0-9]{12,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{12,}|AKIA[0-9A-Z]{12,})\b/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
]
const KEY_VALUE_SECRET_PATTERN = /((?:api[_-]?key|secret|token|password|passwd|private[_-]?key)\s*[:=]\s*["']?)([^\s"',;]+)/gi

export function isSensitivePath(relativePath: string, patterns: string[]): boolean {
  const normalized = relativePath.replaceAll(path.sep, '/').toLowerCase()
  const basename = path.posix.basename(normalized)
  return patterns.some((pattern) => globMatch(normalized, pattern) || globMatch(basename, pattern))
}

export function redactSecretLike(input: string): { text: string; redacted: boolean; matchCount: number } {
  let text = input
  let matchCount = 0
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, () => {
      matchCount += 1
      return '[REDACTED_SECRET]'
    })
  }
  text = text.replace(KEY_VALUE_SECRET_PATTERN, (_match, prefix: string) => {
    matchCount += 1
    return `${prefix}[REDACTED_SECRET]`
  })
  return { text, redacted: matchCount > 0, matchCount }
}

export function classifyRepositoryText(text: string): 'untrusted-repository-content' {
  void text
  return 'untrusted-repository-content'
}

function globMatch(value: string, pattern: string): boolean {
  const escaped = pattern.toLowerCase().replace(/[.+^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*')
  return new RegExp(`^${escaped}$`).test(value)
}
