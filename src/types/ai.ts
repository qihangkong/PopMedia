// AI 节点角色类型
export type NodeRole =
  | 'writer'        // 写作（剧本、小说、文章）
  | 'summarizer'    // 总结摘要
  | 'translator'    // 翻译
  | 'analyzer'      // 分析
  | 'generator'     // 生成器
  | 'editor'        // 编辑器
  | 'reviewer'      // 审核评论

// AI 节点配置
export interface NodeAIConfig {
  role: NodeRole
  model?: string              // 可选，指定使用的模型
  temperature?: number        // 生成温度
  maxTokens?: number          // 最大生成长度
  autoExecution?: boolean     // 是否自动执行
  preserveHistory?: boolean   // 保留对话历史
}

// 上下文缓存
export interface CachedContext {
  upstreamContent: string[]
  timestamp: number
}

// 执行状态
export interface ExecutionState {
  status: 'idle' | 'pending' | 'generating' | 'completed' | 'error'
  progress?: string            // 当前步骤
  result?: string              // 生成结果
  error?: string
  startTime?: number
}

// 聊天消息
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  nodeMentions?: string[]      // 引用了哪些节点ID
  timestamp: number
}

// ========== Tool Calling Types ==========

// Tool 参数定义
export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description?: string
  default?: unknown
}

// Tool 输入 Schema
export interface ToolInputSchema {
  type: 'object'
  properties: Record<string, ToolParameter>
  required?: string[]
}

// Tool 定义 (用于传递给 LLM)
export interface ToolDefinition {
  name: string
  description: string
  input_schema: ToolInputSchema
}

// Tool 调用 (LLM 返回)
export interface ToolCall {
  name: string
  arguments: Record<string, unknown>
}

// Tool 执行结果
export interface ToolResult {
  name: string
  output: string // JSON stringified
  error?: string
}

// LLM 响应 (包含 content 和可选的 tool_calls)
export interface LlmResponse {
  content?: string
  tool_calls?: ToolCall[]
  error?: string
}

// 消息格式 (用于多轮对话)
export interface LlmMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  tool_calls?: ToolCall[]
  tool_call_id?: string
}
