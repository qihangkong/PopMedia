import type { Node, Edge } from '@xyflow/react'
import { sendChatMessage } from '../utils/chatApi'
import { UpstreamContextManager, extractNodeContent } from './UpstreamContextManager'
import { IntentClassifier, Intent } from './IntentClassifier'
import { skillRegistry } from './SkillRegistry'
import type { ExecutionState, ChatMessage } from '../types/ai'
import type { NodeData } from '../types'

// 角色对应的System Prompt
const ROLE_PROMPTS: Record<string, string> = {
  'writer': `你是一个专业的剧本创作助手。

规则：
- 深入理解素材的核心情节和人物
- 剧本格式：场景编号 | 场景描述 | 角色对白 | 动作指示
- 保持原素材的创意和情感
- 对白要自然，符合角色性格`,

  'summarizer': `你是一个文本摘要专家。

规则：
- 提取核心信息和关键点
- 保持逻辑连贯性
- 长度控制在原文的1/3到1/2
- 使用简洁清晰的语言`,

  'translator': `你是一个专业翻译。

规则：
- 保持原文风格和语气
- 符合目标语言的表达习惯
- 专业术语准确翻译`,

  'analyzer': `你是一个内容分析专家。

规则：
- 深入分析内容结构和逻辑
- 识别关键主题和论点
- 提供建设性的分析意见`,

  'generator': `你是一个内容生成专家。

规则：
- 根据素材生成相关的内容
- 保持创意性和实用性
- 输出格式清晰`,

  'editor': `你是一个文字编辑。

规则：
- 优化语言表达
- 保持原文意图
- 提升可读性和专业性`,

  'reviewer': `你是一个评论专家。

规则：
- 客观公正地评价内容
- 提出具体改进建议
- 肯定优点，指出不足`
}

export enum ChatMode {
  GLOBAL_CHAT = 'global',    // 全局多轮对话
  NODE_EXECUTE = 'node',      // 节点单轮执行
  CROSS_NODE = 'cross'        // 跨节点引用
}

export interface ExecutionOptions {
  mode: ChatMode
  userInput: string
  nodeId?: string              // 节点模式必填
  mentionNodeIds?: string[]   // 跨节点模式引用的节点
  messages?: ChatMessage[]     // 全局模式的历史
  nodes?: Node[]               // 所有节点(节点/跨节点模式)
  edges?: Edge[]               // 所有边(节点模式)
  hiddenNodeIds?: Set<string>  // 隐藏的节点ID，这些节点不会被获取
  model?: string              // 指定的模型名称
  canvasName?: string         // 画布名称(用于日志)
  nodeName?: string           // 节点名称(用于日志)
  sessionId?: string         // 会话ID(用于日志文件)
  onStateChange?: (state: ExecutionState) => void
}

export class AIExecutionEngine {
  /**
   * 执行AI任务
   */
  async execute(options: ExecutionOptions): Promise<string> {
    const { mode, userInput, model, canvasName, nodeName, sessionId, ...rest } = options

    switch (mode) {
      case ChatMode.GLOBAL_CHAT:
        return this.executeGlobalChat(userInput)
      case ChatMode.NODE_EXECUTE:
        return this.executeNodeTask(userInput, rest.nodeId, rest.nodes, rest.edges, rest.hiddenNodeIds, model, canvasName, nodeName, sessionId, rest.onStateChange)
      case ChatMode.CROSS_NODE:
        return this.executeCrossNode(userInput, rest.mentionNodeIds, rest.nodes, model, rest.onStateChange)
      default:
        throw new Error(`Unknown mode: ${mode}`)
    }
  }

  /**
   * 节点执行模式
   */
  async executeNodeTask(
    userInput: string,
    nodeId: string | undefined,
    nodes: Node[] | undefined,
    edges: Edge[] | undefined,
    hiddenNodeIds: Set<string> | undefined,
    model: string | undefined,
    canvasName: string | undefined,
    nodeName: string | undefined,
    sessionId: string | undefined,
    onStateChange?: (state: ExecutionState) => void
  ): Promise<string> {
    if (!nodeId || !nodes || !edges) {
      throw new Error('Node task requires nodeId, nodes and edges')
    }

    const node = nodes.find(n => n.id === nodeId)
    if (!node) throw new Error(`Node not found: ${nodeId}`)

    const nodeData = node.data as unknown as NodeData

    try {
      onStateChange?.({ status: 'pending', progress: '分析意图...' })

      const aiConfig = nodeData.aiConfig
      const intent = IntentClassifier.classify(userInput, aiConfig?.role)

      let upstreamContent = ''
      if (intent.needsUpstream) {
        onStateChange?.({ status: 'pending', progress: '获取上游内容...' })
        const upstreamNodes = UpstreamContextManager.getUpstreamContent(nodeId, nodes, edges)

        // 过滤掉隐藏的节点
        const visibleNodes = upstreamNodes.filter(n => !hiddenNodeIds?.has(n.nodeId))
        upstreamContent = UpstreamContextManager.buildContextPrompt(visibleNodes)
      }

      onStateChange?.({ status: 'generating', progress: '正在生成...' })
      const fullPrompt = this.buildPrompt(intent, upstreamContent, nodeData)
      const result = await sendChatMessage(fullPrompt, model, canvasName, nodeName, sessionId)

      onStateChange?.({ status: 'completed', result, startTime: Date.now() })
      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      onStateChange?.({ status: 'error', error: errorMessage })
      throw error
    }
  }

  /**
   * 全局对话模式
   */
  async executeGlobalChat(userInput: string): Promise<string> {
    // 直接调用，不带上下文
    return await sendChatMessage(userInput)
  }

  /**
   * 跨节点模式
   */
  async executeCrossNode(
    userInput: string,
    mentionNodeIds: string[] | undefined,
    nodes: Node[] | undefined,
    model: string | undefined,
    onStateChange?: (state: ExecutionState) => void
  ): Promise<string> {
    if (!mentionNodeIds || !nodes) {
      throw new Error('Cross-node task requires mentionNodeIds and nodes')
    }

    onStateChange?.({ status: 'pending', progress: '获取引用节点内容...' })

    const mentionedNodes = nodes.filter(n => mentionNodeIds.includes(n.id))
    const context = mentionedNodes.map(n => {
      const nodeData = n.data as unknown as NodeData
      return `[${nodeData.label}]\n${extractNodeContent(n)}`
    }).join('\n\n')

    const fullPrompt = `## 引用内容\n${context}\n\n## 用户指令\n${userInput}`
    return await sendChatMessage(fullPrompt, model)
  }

  private buildPrompt(
    intent: Intent,
    upstreamContent: string,
    nodeData: NodeData
  ): string {
    const aiConfig = nodeData.aiConfig

    // 获取角色对应的 system prompt
    const rolePrompt = nodeData.systemPrompt ||
      (aiConfig?.role ? ROLE_PROMPTS[aiConfig.role] : ROLE_PROMPTS['generator'])

    // 获取 skills 上下文，让 AI 自行决定是否使用 skill
    const skillsContext = skillRegistry.getSkillsContext()

    // 构建用户内容
    let userContent = ''

    if (upstreamContent && upstreamContent !== '（无可用上游内容）') {
      userContent = `## 上游素材\n${upstreamContent}\n\n## 用户指令\n${intent.customPrompt || intent.action}`
    } else {
      userContent = `## 用户指令\n${intent.customPrompt || intent.action}`
    }

    // 组合完整 prompt：skills 上下文 + 角色 prompt + 用户内容
    return `${skillsContext}\n\n---\n\n${rolePrompt}\n\n${userContent}`
  }
}

// Singleton instance for backward compatibility
export const aiExecutionEngine = new AIExecutionEngine()
