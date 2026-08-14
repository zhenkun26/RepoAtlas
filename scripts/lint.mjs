import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'

const files = execFileSync('rg', ['--files', 'src'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
const forbidden = /(?:from\s+['"]node:child_process|import\s+.*child_process|\b(?:exec|spawn|fetch|rmSync|unlink|rename)\s*\(|https?:\/\/)/
const violations = []
for (const file of files) {
  const text = await readFile(file, 'utf8')
  if (forbidden.test(text) && !file.includes('/reporting/report.ts')) violations.push(file)
}
if (violations.length) {
  console.error(`FAIL: forbidden side-effect token found in ${violations.join(', ')}`)
  process.exitCode = 1
} else {
  console.log(`PASS: lightweight safety lint scanned ${files.length} files.`)
}
