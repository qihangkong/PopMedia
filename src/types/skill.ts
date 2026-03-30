// Skill 类型定义

export interface Skill {
  id: string           // 文件名（不含扩展名），如 'script-converter'
  name: string         // 如 'script-converter'
  description: string  // 描述，用于 AI 判断何时使用
  systemPrompt: string // 系统提示词内容
  needsUpstream: boolean // 是否需要上游内容
}

// Skill 文件元信息（用于列表）
export interface SkillMeta {
  id: string
  name: string
  description: string
}
