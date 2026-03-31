import { getSkills, getSkill, loadSkillReference, type SkillMeta } from '../utils/tauriApi'

export { type Skill } from '../types/skill'

/**
 * SkillRegistry - 三级加载机制
 *
 * Level 1: YAML frontmatter (name + description) - 启动时始终加载
 * Level 2: SKILL.md 正文 (body) - 触发技能时加载
 * Level 3: 引用的文件 (references/, scripts/) - 按需加载
 */
class SkillRegistry {
  // Level 1: 轻量级元数据 (始终可用)
  private skillMetas: Map<string, { id: string; name: string; description: string }> = new Map()
  // Level 2: 完整技能内容 (懒加载)
  private skillBodies: Map<string, string> = new Map()
  // Level 3: 引用文件 (按需加载)
  private skillReferences: Map<string, Map<string, string>> = new Map()

  private initialized: boolean = false

  /**
   * 初始化 - Level 1: 只加载元数据 (name + description)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      const metas = await getSkills()

      this.skillMetas.clear()
      for (const meta of metas) {
        this.skillMetas.set(meta.id, {
          id: meta.id,
          name: meta.name,
          description: meta.description
        })
      }

      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize skill registry:', error)
      this.initialized = true
    }
  }

  /**
   * 获取 skill 的完整内容 - Level 2: 按需加载
   */
  async getSkillBody(id: string): Promise<string> {
    // 先检查缓存
    if (this.skillBodies.has(id)) {
      return this.skillBodies.get(id)!
    }

    try {
      const skillInfo = await getSkill(id)
      const body = skillInfo.body
      this.skillBodies.set(id, body)
      return body
    } catch (e) {
      console.error(`Failed to load skill body for ${id}:`, e)
      return ''
    }
  }

  /**
   * 获取 skill 的引用文件 - Level 3: 按需加载
   */
  async getSkillReferences(id: string, level: 'references' | 'scripts'): Promise<Map<string, string>> {
    const cacheKey = `${id}:${level}`

    if (this.skillReferences.has(cacheKey)) {
      return this.skillReferences.get(cacheKey)!
    }

    try {
      const refs = await loadSkillReference(id, level)
      const refMap = new Map<string, string>()
      for (const ref of refs) {
        refMap.set(ref.name, ref.content)
      }
      this.skillReferences.set(cacheKey, refMap)
      return refMap
    } catch (e) {
      console.error(`Failed to load skill references for ${id}/${level}:`, e)
      return new Map()
    }
  }

  /**
   * 根据 ID 查找 skill 元数据 (Level 1)
   */
  findById(id: string) {
    return this.skillMetas.get(id) || null
  }

  /**
   * 获取所有 skills 元数据 (Level 1)
   */
  getAll(): { id: string; name: string; description: string }[] {
    return Array.from(this.skillMetas.values())
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
    return this.getAll().map(s => ({
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
    this.skillMetas.clear()
    this.skillBodies.clear()
    this.skillReferences.clear()
    await this.initialize()
  }

  /**
   * 重置内部状态（用于测试）
   */
  _reset(): void {
    this.initialized = false
    this.skillMetas.clear()
    this.skillBodies.clear()
    this.skillReferences.clear()
  }
}

// Singleton instance
export const skillRegistry = new SkillRegistry()
