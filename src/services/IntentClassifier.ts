import type { NodeRole } from '../types/ai'

export interface Intent {
  action: 'generate' | 'summarize' | 'translate' | 'analyze' | 'edit' | 'review' | 'custom'
  target?: string               // 具体目标，如"剧本"、"摘要"
  customPrompt?: string         // 用户原始输入
  needsUpstream: boolean        // 是否需要上游内容
  confidence: number            // 置信度 0-1
}

const INTENT_PATTERNS: Record<string, { patterns: RegExp[], roles: NodeRole[] }> = {
  generate: {
    patterns: [/生成.*/i, /创作.*/i, /编写.*/i, /制作.*/i, /create.*script/i],
    roles: ['writer', 'generator']
  },
  summarize: {
    patterns: [/总结/i, /概括/i, /摘要/i, /提炼/i, /summarize/i],
    roles: ['summarizer']
  },
  translate: {
    patterns: [/翻译/i, /译成/i, /translate/i],
    roles: ['translator']
  },
  analyze: {
    patterns: [/分析/i, /解读/i, /拆解/i, /analyze/i],
    roles: ['analyzer']
  },
  edit: {
    patterns: [/修改/i, /编辑/i, /润色/i, /改写/i, /edit/i],
    roles: ['editor']
  },
  review: {
    patterns: [/评论/i, /评价/i, /审核/i, /review/i],
    roles: ['reviewer']
  }
}

export class IntentClassifier {
  /**
   * 识别用户输入的意图
   */
  static classify(userInput: string, nodeRole?: NodeRole): Intent {
    // 如果节点有预设角色，使用角色相关的action
    if (nodeRole) {
      const intent = this.classifyWithRole(userInput, nodeRole)
      if (intent.confidence > 0.8) return intent
    }

    // 通用模式匹配
    for (const [action, config] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of config.patterns) {
        if (pattern.test(userInput)) {
          return {
            action: action as Intent['action'],
            target: this.extractTarget(userInput),
            customPrompt: userInput,
            needsUpstream: true,
            confidence: 0.9
          }
        }
      }
    }

    // 无法识别，返回自定义意图
    return {
      action: 'custom',
      customPrompt: userInput,
      needsUpstream: true,
      confidence: 0.5
    }
  }

  private static classifyWithRole(userInput: string, role: NodeRole): Intent {
    const roleToAction: Record<NodeRole, Intent['action']> = {
      'writer': 'generate',
      'generator': 'generate',
      'summarizer': 'summarize',
      'translator': 'translate',
      'analyzer': 'analyze',
      'editor': 'edit',
      'reviewer': 'review'
    }

    return {
      action: roleToAction[role],
      target: this.extractTarget(userInput),
      customPrompt: userInput,
      needsUpstream: true,
      confidence: 0.95
    }
  }

  private static extractTarget(input: string): string | undefined {
    const targets = ['剧本', '脚本', '摘要', '总结', '翻译', '分析', '评论']
    return targets.find(t => input.includes(t))
  }
}
