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

/**
 * Send a chat message to the configured LLM and get a response
 */
export async function sendChatMessage(content: string): Promise<string> {
  try {
    // Get the first available LLM config
    const configs = await invoke<LlmConfig[]>('get_llm_configs')

    if (!configs || configs.length === 0) {
      throw new Error('请先在设置中配置 LLM API')
    }

    // Use the first config for now
    const config = configs[0]

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
