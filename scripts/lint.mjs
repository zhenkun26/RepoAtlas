import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'

const files = execFileSync('rg', ['--files', 'src'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
const forbidden = /(?:from\s+['"]node:child_process|import\s+.*child_process|\b(?:exec|fetch|rmSync|unlink|rename)\s*\(|https?:\/\/)/
const capabilitySpawn = /\bspawn\s*\(/g
const violations = []
for (const file of files) {
  const text = await readFile(file, 'utf8')
  const directSpawn = capabilitySpawn.test(text)
  capabilitySpawn.lastIndex = 0
  const spawnOutsideAdapter = directSpawn && !file.endsWith('/actions/runtime.ts')
  const fixedGitAdapter = file.endsWith('/repository/change-proposal.ts')
  if ((forbidden.test(text) || spawnOutsideAdapter) && !file.includes('/reporting/report.ts') && !fixedGitAdapter) violations.push(file)
}
if (violations.length) {
  console.error(`FAIL: forbidden side-effect token found in ${violations.join(', ')}`)
  process.exitCode = 1
} else {
  console.log(`PASS: lightweight safety lint scanned ${files.length} files.`)
}
