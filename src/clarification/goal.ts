import type { GoalIntent, GoalSpec } from '../types.ts'

export const SAFE_DEFAULT_OUTPUTS = ['Markdown 报告', 'Mermaid 关系图', '结构化 atlas 数据']

export function createGoalSpec(input: Partial<GoalSpec> = {}): GoalSpec {
  return {
    intent: input.intent,
    audience: input.audience,
    scope: input.scope,
    outputs: input.outputs ?? [...SAFE_DEFAULT_OUTPUTS],
    permissions: input.permissions ?? ['read'],
    success_criteria: input.success_criteria,
    confirmed: input.confirmed ?? false,
  }
}

export function missingGoalFields(goal: GoalSpec): Array<keyof GoalSpec> {
  const missing: Array<keyof GoalSpec> = []
  if (!goal.intent) missing.push('intent')
  if (!goal.audience?.trim()) missing.push('audience')
  if (!goal.scope?.length) missing.push('scope')
  if (!goal.outputs?.length) missing.push('outputs')
  if (!goal.success_criteria?.length) missing.push('success_criteria')
  return missing
}

export interface ClarificationQuestion {
  field: keyof GoalSpec
  question: string
  safeDefault?: string
}

export function nextClarificationQuestion(goal: GoalSpec): ClarificationQuestion | undefined {
  const field = missingGoalFields(goal)[0]
  if (!field) return undefined
  const questions: Record<string, ClarificationQuestion> = {
    intent: { field: 'intent', question: '这次先做哪类分析：项目接手概览，还是架构概览？', safeDefault: '项目接手概览' },
    audience: { field: 'audience', question: '报告主要给谁使用，例如新接手的开发者、评审者或团队？', safeDefault: '新接手项目的开发者' },
    scope: { field: 'scope', question: '希望分析整个 workspace，还是限定到某些目录或文件？', safeDefault: '当前 workspace，遵循默认排除目录' },
    outputs: { field: 'outputs', question: '除了默认的 Markdown、Mermaid 和 atlas 数据，还需要什么输出？', safeDefault: SAFE_DEFAULT_OUTPUTS.join('、') },
    success_criteria: { field: 'success_criteria', question: '什么结果可以算本次分析完成？', safeDefault: '能够据证据说明入口、主要模块、技术栈和推荐阅读顺序' },
  }
  return questions[field as string]
}

export function applyGoalAnswer(goal: GoalSpec, field: keyof GoalSpec, answer: unknown): GoalSpec {
  const next = { ...goal, confirmed: false }
  if (field === 'intent') next.intent = normalizeIntent(answer)
  else if (field === 'audience') next.audience = String(answer)
  else if (field === 'scope') next.scope = normalizeList(answer)
  else if (field === 'outputs') next.outputs = normalizeList(answer)
  else if (field === 'permissions') next.permissions = normalizeList(answer)
  else if (field === 'success_criteria') next.success_criteria = normalizeList(answer)
  return next
}

export function confirmGoal(goal: GoalSpec): GoalSpec {
  if (missingGoalFields(goal).length > 0) throw new Error('Cannot confirm an incomplete GoalSpec')
  return { ...goal, permissions: ['read'], confirmed: true }
}

export function resolveStart(goal: GoalSpec, mode: 'confirm' | 'direct'): GoalSpec {
  const withDefaults = applySafeDefaults(goal)
  if (mode === 'direct') {
    return confirmGoal(withDefaults)
  }
  return withDefaults
}

export function applySafeDefaults(goal: GoalSpec): GoalSpec {
  return {
    ...goal,
    intent: goal.intent ?? 'onboarding',
    audience: goal.audience ?? '新接手项目的开发者',
    scope: goal.scope?.length ? goal.scope : ['.'],
    outputs: goal.outputs?.length ? goal.outputs : [...SAFE_DEFAULT_OUTPUTS],
    permissions: ['read'],
    success_criteria: goal.success_criteria?.length
      ? goal.success_criteria
      : ['能够据证据说明入口、主要模块、技术栈和推荐阅读顺序'],
    confirmed: false,
  }
}

export function refineGoal(goal: GoalSpec, patch: Partial<GoalSpec>): GoalSpec {
  return applySafeDefaults({ ...goal, ...patch, confirmed: false })
}

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean)
  return String(value ?? '').split(/[,，\n]/).map((item) => item.trim()).filter(Boolean)
}

function normalizeIntent(value: unknown): GoalIntent {
  const text = String(value ?? '').toLowerCase()
  if (text.includes('架构') || text.includes('architecture')) return 'architecture'
  if (text.includes('接手') || text.includes('onboarding')) return 'onboarding'
  return 'custom'
}
