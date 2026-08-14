import { createGoalSpec, resolveStart, analyzeRepository, generateReport } from '../src/index.ts'

const goal = resolveStart(createGoalSpec({ intent: 'onboarding' }), 'direct')
const session = await analyzeRepository(goal, process.cwd())
const report = generateReport(session)

console.log(report.markdown)
