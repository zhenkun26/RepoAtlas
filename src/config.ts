import path from 'node:path'
import type { RepoAtlasConfig } from './types.ts'

export const DEFAULT_EXCLUDE_DIRS = [
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.cache',
  '.venv',
  'venv',
]

export const DEFAULT_SENSITIVE_FILE_PATTERNS = [
  '.env',
  '.env.*',
  '*.pem',
  '*.key',
  'credentials.*',
  '*credentials*',
  '*secret*',
]

export const DEFAULT_CONFIG: Omit<RepoAtlasConfig, 'workspaceRoot'> = {
  excludeDirs: DEFAULT_EXCLUDE_DIRS,
  sensitiveFilePatterns: DEFAULT_SENSITIVE_FILE_PATTERNS,
  maxCandidateFiles: 5_000,
  maxFileBytes: 1 * 1024 * 1024,
  maxTotalBytes: 20 * 1024 * 1024,
  maxActions: 60,
}

export function createConfig(workspaceRoot: string, overrides: Partial<Omit<RepoAtlasConfig, 'workspaceRoot'>> = {}): RepoAtlasConfig {
  return {
    workspaceRoot: path.resolve(workspaceRoot),
    scope: overrides.scope?.length ? [...overrides.scope] : undefined,
    excludeDirs: [...(overrides.excludeDirs ?? DEFAULT_CONFIG.excludeDirs)],
    sensitiveFilePatterns: [...(overrides.sensitiveFilePatterns ?? DEFAULT_CONFIG.sensitiveFilePatterns)],
    maxCandidateFiles: positiveInteger(overrides.maxCandidateFiles ?? DEFAULT_CONFIG.maxCandidateFiles, 'maxCandidateFiles'),
    maxFileBytes: positiveInteger(overrides.maxFileBytes ?? DEFAULT_CONFIG.maxFileBytes, 'maxFileBytes'),
    maxTotalBytes: positiveInteger(overrides.maxTotalBytes ?? DEFAULT_CONFIG.maxTotalBytes, 'maxTotalBytes'),
    maxActions: positiveInteger(overrides.maxActions ?? DEFAULT_CONFIG.maxActions, 'maxActions'),
  }
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive safe integer`)
  }
  return value
}
