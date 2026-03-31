import type { Node, Edge } from '@xyflow/react'
import { sendChatMessageWithTools as defaultSendChatMessageWithTools } from '../utils/chatApi'
import { UpstreamContextManager } from './UpstreamContextManager'
import { skillRegistry } from './SkillRegistry'
import { toolRegistry } from './ToolRegistry'
import type { ExecutionState, LlmMessage, ToolResult } from '../types/ai'
import type { NodeData } from '../types'

// Type for the chat API function (allows dependency injection)
type SendChatMessageFn = typeof defaultSendChatMessageWithTools

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
  NODE_AGENTIC = 'node'      // 节点Agentic多轮执行
}

export interface ExecutionOptions {
  mode: ChatMode
  userInput: string
  nodeId?: string              // 节点模式必填
  nodes?: Node[]               // 所有节点
  edges?: Edge[]               // 所有边
  hiddenNodeIds?: Set<string>  // 隐藏的节点ID
  model?: string              // 指定的模型名称
  canvasName?: string         // 画布名称(用于日志)
  nodeName?: string           // 节点名称(用于日志)
  sessionId?: string         // 会话ID(用于日志文件)
  onStateChange?: (state: ExecutionState) => void
  onWriteNode?: (nodeId: string, content: string) => void
}

export class AIExecutionEngine {
  private sendChatMessageFn: SendChatMessageFn

  constructor(sendChatMessageFn?: SendChatMessageFn) {
    this.sendChatMessageFn = sendChatMessageFn || defaultSendChatMessageWithTools
  }

  /**
   * 执行AI任务
   */
  async execute(options: ExecutionOptions): Promise<string> {
    const { mode, userInput, model, canvasName, nodeName, sessionId, ...rest } = options

    switch (mode) {
      case ChatMode.GLOBAL_CHAT:
        return this.executeGlobalChat(userInput)
      case ChatMode.NODE_AGENTIC:
        return this.executeNodeTask(
          userInput, rest.nodeId, rest.nodes, rest.edges, rest.hiddenNodeIds,
          model, canvasName, nodeName, sessionId, rest.onStateChange, rest.onWriteNode
        )
      default:
        throw new Error(`Unknown mode: ${mode}`)
    }
  }

  /**
   * 节点Agentic多轮执行模式 (Tool Calling)
   *
   * 流程:
   * 1. AI分析用户指令，返回tool_calls
   * 2. 执行tool (read_node等)，将结果添加到消息
   * 3. AI继续分析，决定下一步
   * 4. 循环直到AI返回最终回复
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
    onStateChange?: (state: ExecutionState) => void,
    onWriteNode?: (nodeId: string, content: string) => void
  ): Promise<string> {
    if (!nodeId || !nodes || !edges) {
      throw new Error('Node task requires nodeId, nodes and edges')
    }

    const node = nodes.find(n => n.id === nodeId)
    if (!node) throw new Error(`Node not found: ${nodeId}`)

    const nodeData = node.data as unknown as NodeData

    // Update tool registry with current canvas state
    toolRegistry.setCanvasState(nodes, edges)

    try {
      onStateChange?.({ status: 'pending', progress: 'AI分析中...' })

      // Build initial prompt with context info (NO upstream content pre-fetched)
      const initialPrompt = this.buildPrompt(userInput, nodeId, nodeData, nodes, edges, hiddenNodeIds)

      // Get all available tools
      const tools = toolRegistry.getAllTools()

      // Initialize messages array
      const messages: LlmMessage[] = [
        {
          role: 'user',
          content: initialPrompt
        }
      ]

      // Agentic loop
      const maxIterations = 10
      for (let i = 0; i < maxIterations; i++) {
        onStateChange?.({ status: 'generating', progress: `AI思考中... (${i + 1}/${maxIterations})` })

        // Send to LLM with tools
        const response = await this.sendChatMessageFn(
          messages,
          tools,
          model,
          canvasName,
          nodeName,
          sessionId
        )

        // Check if LLM returned tool_calls
        if (response.tool_calls && response.tool_calls.length > 0) {
          // Execute each tool call
          const toolResults: ToolResult[] = []
          for (const toolCall of response.tool_calls) {
            const result = await toolRegistry.executeTool(toolCall)

            // Handle write_node - call the callback to update React state
            if (toolCall.name === 'write_node' && onWriteNode) {
              const args = toolCall.arguments as { nodeId: string; content: string }
              if (!result.error) {
                onWriteNode(args.nodeId, args.content)
              }
            }

            toolResults.push(result)
          }

          // Add assistant's tool_calls message
          messages.push({
            role: 'assistant',
            content: response.content || '',
            tool_calls: response.tool_calls
          })

          // Add tool results as user messages
          for (let j = 0; j < response.tool_calls.length; j++) {
            const toolCall = response.tool_calls[j]
            const result = toolResults[j]
            messages.push({
              role: 'user',
              content: `Tool result for "${toolCall.name}":\n${result.output}${result.error ? `\nError: ${result.error}` : ''}`
            })
          }
        } else {
          // No tool_calls, this is the final response
          onStateChange?.({ status: 'completed', result: response.content || '', startTime: Date.now() })
          return response.content || ''
        }
      }

      // Max iterations reached
      const errorMsg = '达到最大迭代次数，任务未完成'
      onStateChange?.({ status: 'error', error: errorMsg })
      throw new Error(errorMsg)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      onStateChange?.({ status: 'error', error: errorMessage })
      throw error
    }
  }

  /**
   * 构建提示词
   * 只传递元数据，不预取上游内容
   */
  private buildPrompt(
    userInput: string,
    currentNodeId: string,
    nodeData: NodeData,
    nodes: Node[],
    edges: Edge[],
    hiddenNodeIds: Set<string> | undefined
  ): string {
    const aiConfig = nodeData.aiConfig

    // 获取角色对应的 system prompt
    const rolePrompt = nodeData.systemPrompt ||
      (aiConfig?.role ? ROLE_PROMPTS[aiConfig.role] : ROLE_PROMPTS['generator'])

    // 获取画布节点列表（不包含内容）
    const visibleNodes = nodes.filter(n => !hiddenNodeIds?.has(n.id))
    const nodeList = visibleNodes.map(n => {
      const data = n.data as unknown as NodeData
      return `- ${n.id}: [${data.type}] ${data.label}`
    }).join('\n')

    // 获取当前节点的上游节点ID列表（不包含内容）
    const upstreamNodes = UpstreamContextManager.getUpstreamContent(currentNodeId, nodes, edges)
    const visibleUpstream = upstreamNodes.filter(n => !hiddenNodeIds?.has(n.nodeId))
    const upstreamList = visibleUpstream.map(n =>
      `- ${n.nodeId}: [${n.type}] ${n.nodeLabel} (距离${n.distance}跳)`
    ).join('\n')

    // Skill 列表
    const skills = skillRegistry.getAll()
    const skillList = skills.map(s => `- ${s.id}: ${s.description}`).join('\n')

    return `${rolePrompt}

## 当前任务节点
- 节点ID: ${currentNodeId}
- 节点类型: ${nodeData.type}
- 节点角色: ${aiConfig?.role || 'generator'}

## 画布节点列表
${nodeList || '（无其他节点）'}

## 当前节点的上游节点
${upstreamList || '（无上游节点）'}

## 可用的SKILL工具
${skillList || '（无可用SKILL）'}

## 你的工具
你可以使用以下工具来完成任务：
- read_node(nodeId): 读取指定节点的内容
- write_node(nodeId, content): 向指定节点写入内容
- list_nodes(): 列出所有节点
- get_upstream(nodeId, maxDepth?): 获取节点的上游信息

## 规则
1. 如果需要处理上游内容，先用 read_node 读取
2. 如果需要使用 SKILL，使用 skill 工具并传入需要处理的内容
3. 如果需要将结果写入节点，使用 write_node
4. 完成后返回最终结果给用户

## 用户指令
${userInput}`
  }

  /**
   * 全局对话模式 (暂未实现agentic版本)
   */
  async executeGlobalChat(_userInput: string): Promise<string> {
    throw new Error('Global chat mode not yet implemented in agentic style')
  }
}

// Singleton instance
export const aiExecutionEngine = new AIExecutionEngine()
