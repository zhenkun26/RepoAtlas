import { createGoalSpec, missingGoalFields, nextClarificationQuestion, resolveStart } from '../clarification/goal.ts'
import { analyzeRepository } from '../repository/analyze.ts'
import { generateReport } from '../reporting/report.ts'
import { createConfig } from '../config.ts'
import { createControlledActionTool } from './controlled-tool.ts'
import { createChangeProposalTool } from './change-proposal-tool.ts'
import { createChangeProposalVerificationRunner } from './change-proposal-verification.ts'
import { createChangeProposalCommitAuthorizer } from './change-proposal-commit.ts'
import { createChangeProposalLandingAuthorizer } from './change-proposal-landing.ts'
import { ChangeProposalManager } from '../repository/change-proposal.ts'
import type { GoalSpec } from '../types.ts'
import type { HarnessPluginContext, HarnessTool, RepoAtlasPluginConfig, RepoAtlasToolResult } from './public.ts'

export const name = 'repo-atlas'
export const inject = ['tools'] as const

export function apply(ctx: HarnessPluginContext, pluginConfig: RepoAtlasPluginConfig = {}): void {
  const config = createConfig(pluginConfig.workspaceRoot ?? process.cwd(), pluginConfig)
  const proposalManager = new ChangeProposalManager(config)
  const verificationRunner = createChangeProposalVerificationRunner(config, ctx)
  const commitAuthorizer = createChangeProposalCommitAuthorizer(ctx)
  const landingAuthorizer = createChangeProposalLandingAuthorizer(ctx)
  ctx.tools.register(createRepoAtlasTool(config.workspaceRoot, pluginConfig, proposalManager))
  ctx.tools.register(createChangeProposalTool(proposalManager, verificationRunner, commitAuthorizer, landingAuthorizer))
  if (config.controlledActions.enabled) ctx.tools.register(createControlledActionTool(config, ctx))
  ctx.logger?.info('RepoAtlas registered read-only analysis tool')
  ctx.logger?.info('RepoAtlas registered session-only change proposal tool')
  if (config.controlledActions.enabled) ctx.logger?.info('RepoAtlas registered controlled action tool with explicit approval')
}

export function createRepoAtlasTool(workspaceRoot: string, overrides: RepoAtlasPluginConfig = {}, proposalManager = new ChangeProposalManager(createConfig(workspaceRoot, overrides))): HarnessTool {
  return {
    name: 'repo_atlas_analyze',
    description: '通过多轮 GoalSpec 澄清后，对当前 workspace 执行受预算约束的只读代码库分析并生成证据化报告。',
    parameters: {
      type: 'object',
      properties: {
        goal: { type: 'object', description: 'GoalSpec 或其部分字段' },
        start: { type: 'string', enum: ['clarify', 'confirm', 'direct'] },
      },
      additionalProperties: false,
    },
    output: {
      schema: { type: 'object' },
      render: (_args: unknown, value: unknown): Array<{ type: 'text'; text: string }> => [{
        type: 'text',
        text: JSON.stringify(value, null, 2),
      }],
    },
    async execute(input: unknown): Promise<RepoAtlasToolResult> {
      const data = asInput(input)
      let goal = createGoalSpec(data.goal)
      if (data.start === 'direct') goal = resolveStart(goal, 'direct')
      if (!goal.confirmed) {
        return { policy: 'readonly', goal, clarification: { missing: missingGoalFields(goal), question: nextClarificationQuestion(goal) } }
      }
      const session = await analyzeRepository(goal, workspaceRoot, overrides)
      proposalManager.registerSession(session)
      return { policy: 'readonly', goal, report: generateReport(session) }
    },
  }
}

function asInput(input: unknown): { goal: Partial<GoalSpec>; start?: 'clarify' | 'confirm' | 'direct' } {
  if (!input || typeof input !== 'object') return { goal: {} }
  const value = input as Record<string, unknown>
  const start = value.start === 'clarify' || value.start === 'confirm' || value.start === 'direct' ? value.start : undefined
  const goal = value.goal && typeof value.goal === 'object' ? value.goal as Partial<GoalSpec> : value as Partial<GoalSpec>
  return { goal, start }
}
