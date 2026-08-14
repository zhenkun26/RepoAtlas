import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { apply } from '../src/harness/plugin.ts'

test('Harness adapter registers one public read-only tool', async () => {
  const registered: Array<{
    name: string
    output: { schema: Record<string, unknown>; render(args: unknown, value: unknown): Array<{ type: 'text'; text: string }> }
    execute(input: unknown): Promise<unknown>
  }> = []
  const logs: string[] = []
  apply({ tools: { register: (tool) => registered.push(tool) }, logger: { info: (message) => logs.push(message), warn: () => undefined } }, { workspaceRoot: path.join(process.cwd(), 'test', 'fixtures', 'complete-repo') })
  assert.equal(registered.length, 1)
  assert.equal(registered[0].name, 'repo_atlas_analyze')
  assert.deepEqual(registered[0].output.schema, { type: 'object' })
  assert.match(registered[0].output.render({}, { policy: 'readonly' })[0]?.text ?? '', /"policy": "readonly"/)
  const clarification = await registered[0].execute({}) as { clarification?: { question?: { field?: string } } }
  assert.equal(clarification.clarification?.question?.field, 'intent')
  assert.ok(logs.some((message) => message.includes('read-only')))
})

test('registered tool keeps the clarification gate and produces a report after direct start', async () => {
  let tool: { execute(input: unknown): Promise<unknown> } | undefined
  apply({ tools: { register: (registered) => { tool = registered } } }, {
    workspaceRoot: path.join(process.cwd(), 'test', 'fixtures', 'complete-repo'),
  })
  assert.ok(tool)
  const result = await tool.execute({ start: 'direct', goal: { intent: 'onboarding' } }) as { policy: string; report?: { markdown?: string } }
  assert.equal(result.policy, 'readonly')
  assert.match(result.report?.markdown ?? '', /RepoAtlas/)
})
