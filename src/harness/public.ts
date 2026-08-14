import type { AnalysisReport, GoalSpec, RepoAtlasConfig } from '../types.ts'

/**
 * Minimal structural surface used by the public DeepSeek Harness plugin API.
 * The adapter intentionally avoids private Harness internals.
 */
export interface HarnessTool {
  name: string
  description: string
  parameters: Record<string, unknown>
  /** Harness requires a lossless canonical output declaration for every tool. */
  output: {
    schema: Record<string, unknown>
    render(args: unknown, value: unknown): Array<{ type: 'text'; text: string }>
  }
  execute(input: unknown, execution?: unknown): Promise<unknown>
}

export interface HarnessPluginContext {
  tools: { register(tool: HarnessTool): unknown }
  logger?: { info(message: string): void; warn(message: string): void }
}

export interface RepoAtlasPluginConfig extends Partial<Omit<RepoAtlasConfig, 'workspaceRoot'>> {
  workspaceRoot?: string
}

export interface RepoAtlasToolResult {
  clarification?: unknown
  report?: AnalysisReport
  policy: 'readonly'
  goal: GoalSpec
}
