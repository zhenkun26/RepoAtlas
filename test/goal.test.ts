import test from 'node:test'
import assert from 'node:assert/strict'
import { applyGoalAnswer, confirmGoal, createGoalSpec, missingGoalFields, nextClarificationQuestion, resolveStart } from '../src/clarification/goal.ts'

test('GoalSpec asks one main clarification question at a time', () => {
  const goal = createGoalSpec()
  assert.deepEqual(missingGoalFields(goal), ['intent', 'audience', 'scope', 'success_criteria'])
  assert.equal(nextClarificationQuestion(goal)?.field, 'intent')
  const updated = applyGoalAnswer(goal, 'intent', '架构概览')
  assert.equal(updated.intent, 'architecture')
  assert.equal(updated.confirmed, false)
})

test('direct start uses read-only safe defaults and confirms only the bounded goal', () => {
  const goal = resolveStart(createGoalSpec(), 'direct')
  assert.equal(goal.confirmed, true)
  assert.deepEqual(goal.permissions, ['read'])
  assert.deepEqual(goal.scope, ['.'])
})

test('incomplete GoalSpec cannot be confirmed', () => {
  assert.throws(() => confirmGoal(createGoalSpec({ intent: 'onboarding' })), /incomplete/)
})
