import type { Node, Edge } from '@xyflow/react'
import { sendChatMessageWithTools as defaultSendChatMessageWithTools, logToolExecution } from '../utils/chatApi'
import { UpstreamContextManager } from './UpstreamContextManager'
import { skillRegistry } from './SkillRegistry'
import { toolRegistry } from './ToolRegistry'
import type { ExecutionState, LlmMessage, ToolResult } from '../types/ai'
import type { NodeData, BlockContent } from '../types'

// Type for the chat API function (allows dependency injection)
type SendChatMessageFn = typeof defaultSendChatMessageWithTools

// write_node 解析后的数据结构
export interface WriteNodeData {
  content?: string
  imageUrl?: string
  videoUrl?: string
  audioUrl?: string
  contents?: BlockContent[]
}

/**
 * 解析 write_node 的 content 参数，根据节点类型提取对应字段
 */
function parseWriteNodeData(parsed: Record<string, unknown>, nodeType: string): WriteNodeData {
  switch (nodeType) {
    case 'text':
    case 'script':
      return { content: parsed.textnode as string || parsed.content as string }
    case 'image':
      return { imageUrl: parsed.image as string }
    case 'video':
      return { videoUrl: parsed.video as string }
    case 'audio':
      return { audioUrl: parsed.audio as string }
    case 'block':
      // block 节点: { block: [{textnode: "..."}, {image: "..."}] }
      if (Array.isArray(parsed.block)) {
        const contents: BlockContent[] = parsed.block.map((item, index) => {
          if (typeof item === 'object' && item !== null) {
            const obj = item as Record<string, unknown>
            if ('textnode' in obj) {
              return { id: `block-${index}`, type: 'text' as const, content: obj.textnode as string }
            }
            if ('image' in obj) {
              return { id: `block-${index}`, type: 'image' as const, imageUrl: obj.image as string }
            }
            if ('video' in obj) {
              return { id: `block-${index}`, type: 'video' as const, videoUrl: obj.video as string }
            }
            if ('audio' in obj) {
              return { id: `block-${index}`, type: 'audio' as const, audioUrl: obj.audio as string }
            }
          }
          return { id: `block-${index}`, type: 'text' as const, content: String(item) }
        })
        return { contents }
      }
      return { content: parsed.content as string }
    default:
      // 尝试通用解析
      if ('textnode' in parsed) return { content: parsed.textnode as string }
      if ('image' in parsed) return { imageUrl: parsed.image as string }
      if ('video' in parsed) return { videoUrl: parsed.video as string }
      if ('audio' in parsed) return { audioUrl: parsed.audio as string }
      return { content: parsed.content as string }
  }
}

// 角色对应的System Prompt (通用版)
const ROLE_PROMPTS: Record<string, string> = {
  'writer': `你是一个内容创作助手。`,
  'summarizer': `你是一个内容创作助手。`,
  'translator': `你是一个内容创作助手。`,
  'analyzer': `你是一个内容创作助手。`,
  'generator': `你是一个内容创作助手。`,
  'editor': `你是一个内容创作助手。`,
  'reviewer': `你是一个内容创作助手。`
}

// 工具说明模板
const TOOL_GUIDE = `## 工具

**节点操作**:
- read_node(nodeId): 读取指定节点的内容
- write_node(nodeId, content): 向指定节点写入内容
- list_nodes(): 列出所有节点
- get_upstream(nodeId, maxDepth?): 获取上游节点信息

**技能 (SKILL)**: 当你需要对内容进行专业化处理时，先获取技能文档，然后按文档指示处理
- get_skill(skill_id): 获取技能文档（.md），返回技能的完整提示词和使用方法
- 技能列表: script-converter (剧本转换), summarize (摘要), translate (翻译)

## 注意
- 你可以多次调用工具来完成复杂任务
- 如果技能工具无法满足需求，可以直接处理
- 灵活运用你的能力来满足用户需求`

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
  onWriteNode?: (nodeId: string, data: WriteNodeData) => void
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
   *
   * Token优化: 只在第一次发送完整prompt和tools，后续只发送必要的对话历史
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
    onWriteNode?: (nodeId: string, data: WriteNodeData) => void
  ): Promise<string> {
    if (!nodeId || !nodes || !edges) {
      throw new Error('Node task requires nodeId, nodes and edges')
    }

    const node = nodes.find(n => n.id === nodeId)
    if (!node) throw new Error(`Node not found: ${nodeId}`)

    const nodeData = node.data as unknown as NodeData

    try {
      onStateChange?.({ status: 'pending', progress: 'AI分析中...' })

      // Get all available tools
      const tools = toolRegistry.getAllTools()

      // Initialize messages array - system prompt + user message
      const { systemPrompt, userMessage } = this.buildPrompt(userInput, nodeId, nodeData, nodes, edges, hiddenNodeIds)
      const messages: LlmMessage[] = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userMessage
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
          sessionId,
          i + 1 // round number (1-indexed) for logging
        )

        // Check if LLM returned tool_calls
        if (response.tool_calls && response.tool_calls.length > 0) {
          // Execute each tool call
          const toolResults: ToolResult[] = []
          for (const toolCall of response.tool_calls) {
            // Regular tool - execute locally
            const rawArgs = toolCall.function.arguments
            const argsStr = typeof rawArgs === 'string' ? rawArgs : JSON.stringify(rawArgs)
            const result = await toolRegistry.executeTool(toolCall, nodes, edges)

            // Log tool execution
            await logToolExecution(
              canvasName, nodeName, sessionId,
              toolCall.function.name,
              argsStr,
              result.output
            )

            // Handle write_node - call the callback to update React state
            if (toolCall.function.name === 'write_node' && onWriteNode) {
              const parsedArgs = typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs as { nodeId: string; content: string }
              if (!result.error) {
                // Find target node to determine its type
                const targetNode = nodes.find(n => n.id === parsedArgs.nodeId)
                const nodeData = targetNode?.data as unknown as NodeData | undefined
                const nodeType = nodeData?.type || 'text'

                // Parse content as JSON
                let writeData: WriteNodeData = { content: parsedArgs.content }
                try {
                  const parsed = JSON.parse(parsedArgs.content)
                  if (typeof parsed === 'object' && parsed !== null) {
                    writeData = parseWriteNodeData(parsed, nodeType)
                  }
                } catch {
                  // Not JSON, use content as-is for text nodes
                  if (nodeType === 'text' || nodeType === 'script') {
                    writeData = { content: parsedArgs.content }
                  }
                }
                onWriteNode(parsedArgs.nodeId, writeData)
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

          // Add tool results as tool messages (with tool_call_id to link back)
          for (let j = 0; j < response.tool_calls.length; j++) {
            const toolCall = response.tool_calls[j]
            const result = toolResults[j]
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: `${result.output}${result.error ? `\nError: ${result.error}` : ''}`,
              // VolcEngine API requires tool_calls to be present in tool result messages
              tool_calls: [toolCall]
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
   * 返回系统提示词和用户消息分开
   */
  private buildPrompt(
    userInput: string,
    currentNodeId: string,
    nodeData: NodeData,
    nodes: Node[],
    edges: Edge[],
    hiddenNodeIds: Set<string> | undefined
  ): { systemPrompt: string; userMessage: string } {
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
    const skillDescriptions = skills.map(s => `- **${s.id}**：${s.description}`).join('\n')

    // 系统提示词 - 保持简洁
    const systemPrompt = `${rolePrompt}

${TOOL_GUIDE}

## 可用技能
${skillDescriptions || '（无可用技能）'}`

    // 用户消息 - 包含任务上下文
    const userMessage = `## 当前任务

**节点**: ${currentNodeId} (${nodeData.type})
**角色**: ${aiConfig?.role || 'generator'}

## 画布结构
${nodeList ? `**所有节点**:\n${nodeList}` : '（无其他节点）'}

${upstreamList ? `**上游节点** (可读取内容):\n${upstreamList}` : '（无上游节点）'}

## 用户指令
${userInput}`

    return { systemPrompt, userMessage }
  }

  /**
   * 全局对话模式 (暂未实现agentic版本)
   * TODO: 实现全局多轮对话支持
   */
  async executeGlobalChat(_userInput: string): Promise<string> {
    // TODO: 实现全局多轮对话支持
    return '全局对话功能正在开发中，请使用节点 AI 对话'
  }
}

// Singleton instance
export const aiExecutionEngine = new AIExecutionEngine()
