import { execFileSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

const repoRoot = resolve(process.cwd())
const distRoot = join(repoRoot, 'dist')

try {
  rmSync(distRoot, { recursive: true, force: true })
  execFileSync(join(repoRoot, 'node_modules', '.bin', 'tsc'), ['--project', 'tsconfig.build.json'], {
    cwd: repoRoot,
    shell: false,
    stdio: 'inherit',
  })
  console.log('PASS: deterministic ESM and declaration build completed.')
} catch (error) {
  console.error(`FAIL: RepoAtlas build failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = typeof error === 'object' && error && 'status' in error && typeof error.status === 'number' ? error.status : 1
}
