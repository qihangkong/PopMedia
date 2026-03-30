import { getSkills, getSkill, type SkillInfo, type SkillMeta } from '../utils/tauriApi'
import type { Skill } from '../types/skill'

export { type Skill } from '../types/skill'

class SkillRegistry {
  private skills: Map<string, Skill> = new Map()
  private initialized: boolean = false

  /**
   * 初始化，加载所有 skills
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      const skillMetas = await getSkills()

      for (const meta of skillMetas) {
        try {
          const skillInfo = await getSkill(meta.id)
          const skill: Skill = {
            id: skillInfo.id,
            name: skillInfo.name,
            description: skillInfo.description,
            systemPrompt: skillInfo.system_prompt,
            needsUpstream: skillInfo.needs_upstream
          }
          this.skills.set(skill.id, skill)
        } catch (e) {
          console.warn(`Failed to load skill ${meta.id}:`, e)
        }
      }

      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize skill registry:', error)
      this.initialized = true
    }
  }

  /**
   * 根据 ID 查找 skill
   */
  findById(id: string): Skill | null {
    return this.skills.get(id) || null
  }

  /**
   * 获取所有 skills
   */
  getAll(): Skill[] {
    return Array.from(this.skills.values())
  }

  /**
   * 获取所有 skill 的元信息列表（用于 AI 判断）
   * 返回格式化的 skills 上下文
   */
  getSkillsContext(): string {
    const skills = this.getAll()
    if (skills.length === 0) {
      return '无可用的 skills。'
    }

    const lines = skills.map(s =>
      `## ${s.name}\n${s.description}`
    ).join('\n\n')

    return `以下是你可用的 skills：\n\n${lines}\n\n---\n\n当用户输入时，请判断是否需要使用某个 skill。如果是，请使用该 skill 的 system prompt 来处理用户输入。\n如果不需要 skill，请正常对话。`
  }

  /**
   * 获取所有 skill 的简短列表（用于 / 命令补全）
   */
  getAllMeta(): SkillMeta[] {
    return Array.from(this.skills.values()).map(s => ({
      id: s.id,
      name: s.name,
      description: s.description
    }))
  }

  /**
   * 重新加载 skills
   */
  async reload(): Promise<void> {
    this.initialized = false
    this.skills.clear()
    await this.initialize()
  }
}

// Singleton instance
export const skillRegistry = new SkillRegistry()
