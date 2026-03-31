import { describe, it, expect } from 'vitest'
import { IntentClassifier } from '../../services/IntentClassifier'

describe('IntentClassifier', () => {
  describe('classify', () => {
    it('should classify generate intent with 创作 keyword', () => {
      const result = IntentClassifier.classify('创作一个剧本')
      expect(result.action).toBe('generate')
      expect(result.needsUpstream).toBe(true)
      expect(result.confidence).toBe(0.9)
    })

    it('should classify generate intent with 生成 keyword', () => {
      const result = IntentClassifier.classify('生成内容')
      expect(result.action).toBe('generate')
    })

    it('should classify summarize intent', () => {
      const result = IntentClassifier.classify('总结一下这段文字')
      expect(result.action).toBe('summarize')
      expect(result.needsUpstream).toBe(true)
    })

    it('should classify translate intent', () => {
      const result = IntentClassifier.classify('翻译成英文')
      expect(result.action).toBe('translate')
    })

    it('should classify analyze intent', () => {
      const result = IntentClassifier.classify('分析这段内容的结构')
      expect(result.action).toBe('analyze')
    })

    it('should classify edit intent', () => {
      const result = IntentClassifier.classify('编辑这段文字')
      expect(result.action).toBe('edit')
    })

    it('should classify review intent', () => {
      const result = IntentClassifier.classify('评价这段内容')
      expect(result.action).toBe('review')
    })

    it('should return custom intent for unknown input', () => {
      const result = IntentClassifier.classify('hello world')
      expect(result.action).toBe('custom')
      expect(result.confidence).toBe(0.5)
    })

    it('should use node role when confidence is high', () => {
      const result = IntentClassifier.classify('hello', 'writer')
      expect(result.action).toBe('generate')
      expect(result.confidence).toBe(0.95)
    })

    it('should extract target from input', () => {
      const result = IntentClassifier.classify('创作一个剧本')
      expect(result.target).toBe('剧本')
    })

    it('should handle case insensitive patterns', () => {
      const result = IntentClassifier.classify('GENERATE content', 'generator')
      expect(result.action).toBe('generate')
    })

    it('should handle 摘要 keyword for summarize', () => {
      const result = IntentClassifier.classify('请给我一个摘要')
      expect(result.action).toBe('summarize')
    })

    it('should handle 译成 keyword for translate', () => {
      const result = IntentClassifier.classify('译成日文')
      expect(result.action).toBe('translate')
    })

    it('should handle 解读 keyword for analyze', () => {
      const result = IntentClassifier.classify('解读这段对话')
      expect(result.action).toBe('analyze')
    })

    it('should handle 润色 keyword for edit', () => {
      const result = IntentClassifier.classify('润色这段文案')
      expect(result.action).toBe('edit')
    })

    it('should handle 审核 keyword for review', () => {
      const result = IntentClassifier.classify('审核这段内容')
      expect(result.action).toBe('review')
    })

    it('should map writer role to generate action', () => {
      const result = IntentClassifier.classify('写剧本', 'writer')
      expect(result.action).toBe('generate')
    })

    it('should map summarizer role to summarize action', () => {
      const result = IntentClassifier.classify('处理文本', 'summarizer')
      expect(result.action).toBe('summarize')
    })

    it('should map translator role to translate action', () => {
      const result = IntentClassifier.classify('处理文本', 'translator')
      expect(result.action).toBe('translate')
    })

    it('should map analyzer role to analyze action', () => {
      const result = IntentClassifier.classify('处理文本', 'analyzer')
      expect(result.action).toBe('analyze')
    })

    it('should map editor role to edit action', () => {
      const result = IntentClassifier.classify('处理文本', 'editor')
      expect(result.action).toBe('edit')
    })

    it('should map reviewer role to review action', () => {
      const result = IntentClassifier.classify('处理文本', 'reviewer')
      expect(result.action).toBe('review')
    })

    it('should map generator role to generate action', () => {
      const result = IntentClassifier.classify('处理文本', 'generator')
      expect(result.action).toBe('generate')
    })

    it('should preserve custom prompt in result', () => {
      const input = '创作一个剧本'
      const result = IntentClassifier.classify(input)
      expect(result.customPrompt).toBe(input)
    })

    it('should handle 编写 keyword for generate', () => {
      const result = IntentClassifier.classify('编写一个脚本')
      expect(result.action).toBe('generate')
    })

    it('should handle 制作 keyword for generate', () => {
      const result = IntentClassifier.classify('制作视频')
      expect(result.action).toBe('generate')
    })

    it('should handle 概括 keyword for summarize', () => {
      const result = IntentClassifier.classify('概括本文要点')
      expect(result.action).toBe('summarize')
    })

    it('should handle 提炼 keyword for summarize', () => {
      const result = IntentClassifier.classify('提炼核心观点')
      expect(result.action).toBe('summarize')
    })

    it('should handle 拆解 keyword for analyze', () => {
      const result = IntentClassifier.classify('拆解问题结构')
      expect(result.action).toBe('analyze')
    })

    it('should handle 改写 keyword for edit', () => {
      const result = IntentClassifier.classify('改写这段话')
      expect(result.action).toBe('edit')
    })

    it('should handle 评论 keyword for review', () => {
      const result = IntentClassifier.classify('评论这部电影')
      expect(result.action).toBe('review')
    })

    it('should extract target for 脚本', () => {
      const result = IntentClassifier.classify('生成一个脚本')
      expect(result.target).toBe('脚本')
    })

    it('should extract target for 摘要', () => {
      const result = IntentClassifier.classify('总结一下摘要')
      expect(result.target).toBe('摘要')
    })

    it('should not extract target when no known target present', () => {
      const result = IntentClassifier.classify('帮我处理这个')
      expect(result.target).toBeUndefined()
    })

    it('should return needsUpstream as true for custom intent', () => {
      const result = IntentClassifier.classify('随便聊聊')
      expect(result.needsUpstream).toBe(true)
    })

    it('should handle undefined nodeRole parameter', () => {
      const result = IntentClassifier.classify('生成内容', undefined)
      expect(result.action).toBe('generate')
    })

    it('should use role classification when nodeRole is provided', () => {
      // When nodeRole is provided, role-based classification wins with 0.95 confidence
      const result = IntentClassifier.classify('随便输入', 'summarizer')
      expect(result.action).toBe('summarize')
      expect(result.confidence).toBe(0.95)
    })

    it('should have confidence 0.9 for pattern match', () => {
      const result = IntentClassifier.classify('翻译成中文')
      expect(result.confidence).toBe(0.9)
    })

    it('should have confidence 0.95 for role-based classification', () => {
      const result = IntentClassifier.classify('随便输入', 'editor')
      expect(result.confidence).toBe(0.95)
    })
  })
})
