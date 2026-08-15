import path from 'node:path'
import { redactSecretLike } from '../safety/content-policy.ts'
import { decideControlledAction, type ControlledActionRequest, type ControlledActionDecision } from './controlled.ts'
import type { ControlledActionSandboxMode, RepoAtlasConfig } from '../types.ts'

export interface ControlledActionPolicy {
  mode: ControlledActionSandboxMode
  workspaceRoot: string
  sessionId?: string
}

export interface ControlledActionPolicyResolver {
  resolve(request: { mode: ControlledActionSandboxMode; session?: ControlledActionRequest['session']; workspaceRoot?: string }): ControlledActionPolicy
}

export interface ControlledActionRunnerFailureRule {
  allowedExitCodes?: readonly number[]
  fatalSignatures: readonly string[]
  informationalLines?: readonly string[]
}

export interface ControlledActionConfinedArgv {
  argv: string[]
  enforcement: 'full' | 'partial'
  denialSignatures: readonly string[]
  runnerFailureRules: readonly ControlledActionRunnerFailureRule[]
}

export interface ControlledActionSandbox {
  confine(argv: readonly string[], policy: ControlledActionPolicy): ControlledActionConfinedArgv
}

export interface ControlledActionOutputRead {
  text: string
  nextOffset: number
  lossy: boolean
  spillPath?: string
}

export interface ControlledActionOutputReader {
  readFrom(fromByte: number): ControlledActionOutputRead
}

export interface ControlledActionProcess {
  collected: {
    stdout?: ControlledActionOutputReader
    stderr?: ControlledActionOutputReader
  }
  done: Promise<{ exitCode: number | null; signal: string | null }>
  terminate(): void
}

export interface ControlledActionSubprocess {
  spawn(spec: {
    argv: readonly string[]
    cwd: string
    stdio: {
      stdin: 'ignore'
      stdout: { maxBytes: number }
      stderr: { maxBytes: number }
    }
    graceMs: number
    signal?: AbortSignal
  }): ControlledActionProcess
}

export interface ControlledActionRuntime {
  subprocess?: ControlledActionSubprocess
  sandbox?: ControlledActionSandbox
  sandboxPolicy?: ControlledActionPolicyResolver
}

export type ControlledActionStatus = 'success' | 'failed' | 'denied' | 'sandbox-unavailable' | 'timed-out' | 'cancelled'

export interface ControlledActionResult {
  status: ControlledActionStatus
  auditId: string
  recipeId: string
  reason: string
  cwd?: string
  stdout: string
  stderr: string
  outputTruncated: boolean
  redacted: boolean
  redactedMatchCount: number
  exitCode?: number | null
  signal?: string | null
  sandbox?: {
    mode: ControlledActionSandboxMode
    enforcement: 'full'
  }
}

export async function runControlledAction(
  config: RepoAtlasConfig,
  request: ControlledActionRequest,
  runtime: ControlledActionRuntime,
): Promise<ControlledActionResult> {
  const decision = decideControlledAction(config, request)
  if (!decision.allowed) return deniedResult(decision)

  const recipe = decision.recipe
  const cwd = decision.cwd
  const executionRoot = request.workspaceRoot ?? config.workspaceRoot
  if (!recipe || !cwd) return deniedResult({ ...decision, allowed: false, reason: 'approved action is missing its recipe or cwd' })
  if (!runtime.sandbox || !runtime.subprocess || !runtime.sandboxPolicy) {
    return unavailableResult(decision, 'Harness sandbox, subprocess, and sandboxPolicy capabilities are required')
  }

  let policy: ControlledActionPolicy
  try {
    policy = runtime.sandboxPolicy.resolve({ mode: recipe.sandboxMode, session: request.session, workspaceRoot: executionRoot })
  } catch (error) {
    return unavailableResult(decision, `sandbox policy resolution failed: ${redactError(error)}`)
  }
  if (policy.mode !== recipe.sandboxMode) {
    return unavailableResult(decision, 'resolved sandbox mode does not match the approved recipe')
  }
  if (path.resolve(policy.workspaceRoot) !== path.resolve(executionRoot)) {
    return unavailableResult(decision, 'resolved sandbox workspace does not match the approved workspace')
  }

  const requestedArgv = [recipe.command, ...recipe.args]
  let confined: ControlledActionConfinedArgv
  try {
    confined = runtime.sandbox.confine(requestedArgv, policy)
  } catch (error) {
    return unavailableResult(decision, `sandbox confinement failed: ${redactError(error)}`)
  }
  if (confined.enforcement !== 'full') {
    return unavailableResult(decision, 'sandbox enforcement is partial; refusing to run the action')
  }

  const controller = new AbortController()
  let timedOut = false
  let cancelled = false
  let managedProcess: ControlledActionProcess | undefined
  const abortCaller = () => {
    cancelled = true
    controller.abort()
    managedProcess?.terminate()
  }
  if (request.signal?.aborted) return cancelledResult(decision)
  request.signal?.addEventListener('abort', abortCaller, { once: true })
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
    managedProcess?.terminate()
  }, recipe.timeoutMs)

  try {
    managedProcess = runtime.subprocess.spawn({
      argv: confined.argv,
      cwd,
      stdio: {
        stdin: 'ignore',
        stdout: { maxBytes: recipe.maxOutputBytes },
        stderr: { maxBytes: recipe.maxOutputBytes },
      },
      graceMs: Math.min(3_000, recipe.timeoutMs),
      signal: controller.signal,
    })
    const outcome = await managedProcess.done
    const output = readAndRedact(managedProcess)
    const runnerFailed = isRunnerFailure(outcome.exitCode, output.stderr, confined.runnerFailureRules)
    if (cancelled) {
      return {
        ...baseResult(decision, output),
        status: 'cancelled',
        reason: 'action was cancelled and the managed process tree was terminated',
        exitCode: outcome.exitCode,
        signal: outcome.signal,
        sandbox: { mode: recipe.sandboxMode, enforcement: 'full' },
      }
    }
    if (timedOut) {
      return {
        ...baseResult(decision, output),
        status: 'timed-out',
        reason: 'action exceeded its configured timeout and the managed process tree was terminated',
        exitCode: outcome.exitCode,
        signal: outcome.signal,
        sandbox: { mode: recipe.sandboxMode, enforcement: 'full' },
      }
    }
    if (runnerFailed) {
      return {
        ...baseResult(decision, output),
        status: 'sandbox-unavailable',
        reason: 'sandbox runner failed before the configured action could execute',
        exitCode: outcome.exitCode,
        signal: outcome.signal,
      }
    }
    return {
      ...baseResult(decision, output),
      status: outcome.exitCode === 0 ? 'success' : 'failed',
      reason: outcome.exitCode === 0 ? 'controlled action completed successfully' : 'controlled action exited with a non-zero status',
      exitCode: outcome.exitCode,
      signal: outcome.signal,
      sandbox: { mode: recipe.sandboxMode, enforcement: 'full' },
    }
  } catch (error) {
    if (cancelled) return cancelledResult(decision)
    if (timedOut) {
      return {
        ...baseResult(decision, emptyOutput()),
        status: 'timed-out',
        reason: 'action timeout interrupted process startup',
        sandbox: { mode: recipe.sandboxMode, enforcement: 'full' },
      }
    }
    return {
      ...baseResult(decision, emptyOutput()),
      status: 'failed',
      reason: `controlled subprocess failed: ${redactError(error)}`,
    }
  } finally {
    clearTimeout(timeout)
    request.signal?.removeEventListener('abort', abortCaller)
  }
}

function deniedResult(decision: ControlledActionDecision): ControlledActionResult {
  return {
    status: 'denied',
    auditId: decision.auditId,
    recipeId: decision.recipeId,
    reason: decision.reason,
    cwd: decision.cwd,
    ...emptyOutput(),
  }
}

function unavailableResult(decision: ControlledActionDecision, reason: string): ControlledActionResult {
  return {
    status: 'sandbox-unavailable',
    auditId: decision.auditId,
    recipeId: decision.recipeId,
    reason,
    cwd: decision.cwd,
    ...emptyOutput(),
  }
}

function cancelledResult(decision: ControlledActionDecision): ControlledActionResult {
  return {
    status: 'cancelled',
    auditId: decision.auditId,
    recipeId: decision.recipeId,
    reason: 'action request was cancelled before execution',
    cwd: decision.cwd,
    ...emptyOutput(),
  }
}

function baseResult(decision: ControlledActionDecision, output: RedactedOutput): Omit<ControlledActionResult, 'status' | 'reason'> {
  return {
    auditId: decision.auditId,
    recipeId: decision.recipeId,
    cwd: decision.cwd,
    ...output,
  }
}

interface RedactedOutput {
  stdout: string
  stderr: string
  outputTruncated: boolean
  redacted: boolean
  redactedMatchCount: number
}

function readAndRedact(process: ControlledActionProcess): RedactedOutput {
  const stdoutRead = process.collected.stdout?.readFrom(0)
  const stderrRead = process.collected.stderr?.readFrom(0)
  const stdout = redact(stdoutRead?.text ?? '')
  const stderr = redact(stderrRead?.text ?? '')
  return {
    stdout: stdout.text,
    stderr: stderr.text,
    outputTruncated: (stdoutRead?.lossy ?? false) || (stderrRead?.lossy ?? false),
    redacted: stdout.redacted || stderr.redacted,
    redactedMatchCount: stdout.matchCount + stderr.matchCount,
  }
}

function redact(text: string): { text: string; truncated: boolean; redacted: boolean; matchCount: number } {
  const result = redactSecretLike(text)
  return { text: result.text, truncated: false, redacted: result.redacted, matchCount: result.matchCount }
}

function emptyOutput(): RedactedOutput {
  return { stdout: '', stderr: '', outputTruncated: false, redacted: false, redactedMatchCount: 0 }
}

function isRunnerFailure(
  exitCode: number | null,
  stderr: string,
  rules: readonly ControlledActionRunnerFailureRule[],
): boolean {
  if (exitCode === 0 || rules.length === 0) return false
  const lines = stderr.split(/\r?\n/)
  return rules.some((rule) => {
    if (rule.allowedExitCodes && !rule.allowedExitCodes.includes(exitCode ?? -1)) return false
    return lines.some((line) => {
      if (rule.informationalLines?.some((info) => info.toLowerCase() === line.toLowerCase())) return false
      return rule.fatalSignatures.some((signature) => line.toLowerCase().includes(signature.toLowerCase()))
    })
  })
}

function redactError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return redactSecretLike(message).text
}
