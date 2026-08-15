import { checkWorkspacePath } from '../safety/path-policy.ts'
import type { ControlledActionRecipe, RepoAtlasConfig } from '../types.ts'

export interface ControlledActionSession {
  header?: { cwd?: string }
}

export interface ControlledActionRequest {
  recipeId: string
  cwd?: string
  /** Host-controlled execution root; never populate this from model arguments. */
  workspaceRoot?: string
  session?: ControlledActionSession
  /** Host-attested facts; never populate these from model arguments. */
  goalConfirmed: boolean
  userConfirmed: boolean
  confirmationReason?: string
  signal?: AbortSignal
}

export interface ControlledActionDecision {
  allowed: boolean
  recipeId: string
  reason: string
  auditId: string
  cwd?: string
  recipe?: ControlledActionRecipe
}

export function decideControlledAction(config: RepoAtlasConfig, request: ControlledActionRequest): ControlledActionDecision {
  const auditId = `action-${crypto.randomUUID()}`
  if (!config.controlledActions.enabled) return denied(request.recipeId, auditId, 'controlled actions are disabled by default')
  if (!request.goalConfirmed) return denied(request.recipeId, auditId, 'confirmed GoalSpec is required before an action')
  const recipe = config.controlledActions.recipes.find((candidate) => candidate.id === request.recipeId && candidate.enabled)
  if (!recipe) return denied(request.recipeId, auditId, 'recipe is not configured and enabled')
  const path = checkWorkspacePath(request.workspaceRoot ?? config.workspaceRoot, request.cwd ?? '.')
  if (!path.allowed) return { ...denied(request.recipeId, auditId, path.reason), cwd: path.absolutePath }
  if (!request.userConfirmed) return denied(request.recipeId, auditId, request.confirmationReason ?? 'explicit confirmation is required for this action')
  return {
    allowed: true,
    recipeId: request.recipeId,
    reason: 'controlled action approved for one invocation',
    auditId,
    cwd: path.absolutePath,
    recipe,
  }
}

function denied(recipeId: string, auditId: string, reason: string): ControlledActionDecision {
  return { allowed: false, recipeId, reason, auditId }
}
