import { execFileSync } from 'node:child_process'

try {
  execFileSync('tsc', ['--noEmit'], { stdio: 'inherit' })
  console.log('PASS: TypeScript compiler completed.')
} catch (error) {
  if (error?.code === 'ENOENT') {
    console.error('BLOCKED: tsc is not installed in this workspace; runtime tests still use Node type stripping.')
    process.exitCode = 2
  } else {
    process.exitCode = error.status ?? 1
  }
}
