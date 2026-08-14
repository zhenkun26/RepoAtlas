import type { AnalysisPlan, GoalSpec } from '../types.ts'

export function createAnalysisPlan(goal: GoalSpec): AnalysisPlan {
  const intent = goal.intent ?? 'onboarding'
  if (intent === 'architecture') {
    return {
      name: 'architecture',
      steps: [
        { action: 'list', target: '.', purpose: '建立受边界约束的文件与目录索引' },
        { action: 'search', target: 'import|from|require|include|module', purpose: '发现静态模块关系线索' },
        { action: 'search', target: 'route|router|controller|service|repository|main|app', purpose: '发现入口与主要边界线索' },
        { action: 'read', target: 'README.md', purpose: '读取项目定位和架构说明' },
      ],
    }
  }
  return {
    name: 'onboarding',
    steps: [
      { action: 'list', target: '.', purpose: '建立受边界约束的文件与目录索引' },
      { action: 'read', target: 'README.md', purpose: '读取项目定位和上手说明' },
      { action: 'read', target: 'package.json', purpose: '识别 JavaScript/TypeScript 项目技术栈和脚本' },
      { action: 'read', target: 'pyproject.toml', purpose: '识别 Python 项目技术栈和工具' },
      { action: 'read', target: 'go.mod', purpose: '识别 Go 模块信息' },
      { action: 'read', target: 'Cargo.toml', purpose: '识别 Rust 项目配置' },
      { action: 'search', target: 'main|index|app|server|cli', purpose: '发现可能的入口文件' },
    ],
  }
}
