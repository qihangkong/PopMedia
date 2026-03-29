import { invoke } from '@tauri-apps/api/core'
import type { LlmConfig } from './tauriApi'

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
 */
export async function sendChatMessage(content: string, modelName?: string): Promise<string> {
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
