import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'

const repoRoot = resolve(process.cwd())
const packageFile = join(repoRoot, 'package.json')
const manifest = JSON.parse(readFileSync(packageFile, 'utf8'))
let tempRoot

function assertCondition(condition, message) {
  if (!condition) throw new Error(message)
}

function run(executable, args, options = {}) {
  return execFileSync(executable, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 4 * 1024 * 1024,
    ...options,
  })
}

try {
  assertCondition(manifest.private === true, 'package.json must remain private')
  assertCondition(manifest.license === 'MIT', 'package.json must declare the MIT license')
  assertCondition(manifest.main === './src/index.ts', 'the source package entry point changed unexpectedly')
  assertCondition(manifest.exports?.['.'] === './src/index.ts', 'the root source export changed unexpectedly')
  assertCondition(manifest.exports?.['./harness'] === './src/harness/plugin.ts', 'the Harness source export changed unexpectedly')
  assertCondition(manifest.dsh?.bundle?.patch === './cordis.patch.yml', 'the dsh bundle patch declaration changed unexpectedly')

  tempRoot = mkdtempSync(join(tmpdir(), 'repo-atlas-source-artifact-'))
  const npmEnvironment = { ...process.env, npm_config_cache: join(tempRoot, 'npm-cache') }
  const packOutput = run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', tempRoot], { env: npmEnvironment })
  const packResult = JSON.parse(packOutput)
  const packageFiles = packResult[0]?.files?.map((entry) => entry.path) ?? []
  assertCondition(packageFiles.includes('src/index.ts'), 'packed artifact is missing src/index.ts')
  assertCondition(packageFiles.includes('src/harness/plugin.ts'), 'packed artifact is missing src/harness/plugin.ts')
  assertCondition(packageFiles.includes('cordis.patch.yml'), 'packed artifact is missing cordis.patch.yml')
  assertCondition(!packageFiles.some((file) => file.startsWith('dist/')), 'packed artifact unexpectedly requires dist/')

  const tarballName = readdirSync(tempRoot).find((entry) => entry.endsWith('.tgz'))
  assertCondition(tarballName, 'npm pack did not create a tarball')
  const tarball = join(tempRoot, tarballName)
  const consumer = join(tempRoot, 'consumer')
  mkdirSync(consumer)
  run('npm', ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--prefix', consumer, tarball], { env: npmEnvironment })
  const installedPackage = JSON.parse(readFileSync(join(consumer, 'node_modules', manifest.name, 'package.json'), 'utf8'))
  assertCondition(installedPackage.private === true, 'installed artifact lost private package metadata')
  assertCondition(installedPackage.license === 'MIT', 'installed artifact lost the MIT license metadata')
  assertCondition(installedPackage.exports?.['.'] === './src/index.ts', 'installed artifact lost the root source export')
  assertCondition(installedPackage.exports?.['./harness'] === './src/harness/plugin.ts', 'installed artifact lost the Harness source export')

  console.log(`PASS: source artifact packed-install smoke (${basename(tarball)}).`)
} catch (error) {
  console.error(`FAIL: source artifact packed-install smoke: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
} finally {
  if (tempRoot) rmSync(tempRoot, { recursive: true, force: true })
}
