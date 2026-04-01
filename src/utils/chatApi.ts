import { invoke } from '@tauri-apps/api/core'
import type { LlmConfig } from './tauriApi'
import type { LlmMessage, LlmResponse, ToolDefinition } from '../types/ai'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface SendChatOptions {
  messages: ChatMessage[]
  config: LlmConfig
}

// Cache for LLM configs to avoid fetching on every message
let cachedConfigs: LlmConfig[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 60 * 1000 // 1 minute cache

async function getLlmConfigs(): Promise<LlmConfig[]> {
  const now = Date.now()
  if (cachedConfigs && now - cacheTimestamp < CACHE_TTL) {
    return cachedConfigs
  }
  const configs = await invoke<LlmConfig[]>('get_llm_configs')
  cachedConfigs = configs
  cacheTimestamp = now
  return configs
}

// Invalidate cache when settings change
export function invalidateLlmConfigCache() {
  cachedConfigs = null
  cacheTimestamp = 0
}

// Export cached version for use by other modules
export { getLlmConfigs }

/**
 * Send a chat message to the configured LLM and get a response
 * @param content The message content to send
 * @param modelName Optional specific model to use. If not provided, uses the first configured LLM.
 * @param canvasName Optional canvas name for AI dialogue logging
 * @param nodeName Optional node name for AI dialogue logging
 * @param sessionId Optional session ID for per-session log file
 */
export async function sendChatMessage(
  content: string,
  modelName?: string,
  canvasName?: string,
  nodeName?: string,
  sessionId?: string
): Promise<string> {
  try {
    const configs = await getLlmConfigs()

    if (!configs || configs.length === 0) {
      throw new Error('请先在设置中配置 LLM API')
    }

    // Find config by model name, or use first config
    let config: LlmConfig
    if (modelName) {
      config = configs.find(c => c.model_name === modelName) || configs[0]
    } else {
      config = configs[0]
    }

    if (!config.api_url || !config.api_key) {
      throw new Error('LLM API 配置不完整，请检查设置')
    }

    const result = await invoke<string>('send_chat_message', {
      config,
      message: content,
      canvasName: canvasName || null,
      nodeName: nodeName || null,
      sessionId: sessionId || null,
    })

    return result
  } catch (err) {
    if (err instanceof Error) {
      throw err
    }
    throw new Error(`发送消息失败: ${err}`)
  }
}

/**
 * Send a structured chat request with message history
 */
export async function sendChatRequest(options: SendChatOptions): Promise<string> {
  const { messages, config } = options

  if (!config.api_url || !config.api_key) {
    throw new Error('LLM API 配置不完整，请检查设置')
  }

  return await invoke<string>('send_chat_message', {
    config,
    message: messages[messages.length - 1]?.content || '',
  })
}

/**
 * Send a chat message with tools support (for Agentic multi-turn mode)
 * @param messages Array of message objects with role and content
 * @param tools Array of tool definitions to expose to the LLM
 * @param modelName Optional specific model to use
 * @param canvasName Optional canvas name for logging
 * @param nodeName Optional node name for logging
 * @param sessionId Optional session ID for logging
 * @param round Optional round number for agentic multi-turn logging
 */
export async function sendChatMessageWithTools(
  messages: LlmMessage[],
  tools: ToolDefinition[],
  modelName?: string,
  canvasName?: string,
  nodeName?: string,
  sessionId?: string,
  round?: number
): Promise<LlmResponse> {
  try {
    const configs = await getLlmConfigs()

    if (!configs || configs.length === 0) {
      throw new Error('请先在设置中配置 LLM API')
    }

    // Find config by model name, or use first config
    let config: LlmConfig
    if (modelName) {
      config = configs.find(c => c.model_name === modelName) || configs[0]
    } else {
      config = configs[0]
    }

    if (!config.api_url || !config.api_key) {
      throw new Error('LLM API 配置不完整，请检查设置')
    }

    // Convert LlmMessage[] to the format expected by Rust backend
    const backendMessages = messages.map(m => ({
      role: m.role,
      content: m.content,
      ...(m.tool_calls && { tool_calls: m.tool_calls }),
      ...(m.tool_call_id && { tool_call_id: m.tool_call_id }),
    }))

    const result = await invoke<LlmResponse>('send_chat_message_with_tools', {
      config,
      messages: backendMessages,
      tools: tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
        },
      })),
      canvasName: canvasName || null,
      nodeName: nodeName || null,
      sessionId: sessionId || null,
      round: round ?? null,
    })

    return result
  } catch (err) {
    if (err instanceof Error) {
      throw err
    }
    throw new Error(`发送消息失败: ${err}`)
  }
}

/**
 * Log tool execution to the session log file
 */
export async function logToolExecution(
  canvasName: string | undefined,
  nodeName: string | undefined,
  sessionId: string | undefined,
  toolName: string,
  toolArgs: string,
  toolResult: string
): Promise<void> {
  try {
    await invoke('log_tool_execution', {
      canvasName: canvasName || null,
      nodeName: nodeName || null,
      sessionId: sessionId || null,
      toolName,
      toolArgs,
      toolResult,
    })
  } catch (err) {
    // Silently fail - logging should not interrupt execution
    console.warn('Failed to log tool execution:', err)
  }
}
