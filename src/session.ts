import { confirmGoal, refineGoal } from './clarification/goal.ts'
import { analyzeRepository } from './repository/analyze.ts'
import type { AnalysisSession, GoalSpec, RepoAtlasConfig } from './types.ts'

export async function refineAndAnalyze(session: AnalysisSession, patch: Partial<GoalSpec>, overrides: Partial<Omit<RepoAtlasConfig, 'workspaceRoot'>> = {}, signal?: AbortSignal): Promise<AnalysisSession> {
  const draft = refineGoal(session.goal, patch)
  const goal = patch.confirmed ? confirmGoal(draft) : draft
  if (!goal.confirmed) throw new Error('Refined GoalSpec requires confirmation before analysis')
  const scope = goal.scope?.filter(Boolean)
  return analyzeRepository(goal, session.workspaceRoot, { ...overrides, scope }, signal, session.evidence, session.evidenceCache)
}
