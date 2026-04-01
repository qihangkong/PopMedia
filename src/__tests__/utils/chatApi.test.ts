import { describe, it, expect, vi, beforeEach } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import type { LlmMessage, LlmResponse, ToolDefinition } from '../../types/ai'

// Mock @tauri-apps/api/core first
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

// Import the module under test
import { sendChatMessage, sendChatRequest, sendChatMessageWithTools, invalidateLlmConfigCache, type ChatMessage } from '../../utils/chatApi'

describe('chatApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset cache
    invalidateLlmConfigCache()
  })

  describe('sendChatMessage', () => {
    it('should throw error when no LLM configs available', async () => {
      vi.mocked(invoke).mockResolvedValueOnce([])

      await expect(sendChatMessage('Hello')).rejects.toThrow('请先在设置中配置 LLM API')
    })

    it('should throw error when API URL is empty', async () => {
      vi.mocked(invoke).mockResolvedValueOnce([
        {
          id: '1',
          name: 'Test LLM',
          api_url: '',
          api_key: 'key',
          model_name: 'gpt-4',
        },
      ])

      await expect(sendChatMessage('Hello')).rejects.toThrow('LLM API 配置不完整')
    })

    it('should throw error when API key is empty', async () => {
      vi.mocked(invoke).mockResolvedValueOnce([
        {
          id: '1',
          name: 'Test LLM',
          api_url: 'https://api.example.com',
          api_key: '',
          model_name: 'gpt-4',
        },
      ])

      await expect(sendChatMessage('Hello')).rejects.toThrow('LLM API 配置不完整')
    })

    it('should send message successfully', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce([
          {
            id: '1',
            name: 'Test LLM',
            api_url: 'https://api.example.com',
            api_key: 'test-key',
            model_name: 'gpt-4',
          },
        ])
        .mockResolvedValueOnce('AI response')

      const result = await sendChatMessage('Hello')

      expect(result).toBe('AI response')
    })

    it('should pass optional parameters to backend', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce([
          {
            id: '1',
            name: 'Test LLM',
            api_url: 'https://api.example.com',
            api_key: 'key',
            model_name: 'gpt-4',
          },
        ])
        .mockResolvedValueOnce('AI response')

      await sendChatMessage('Hello', undefined, 'My Canvas', 'Node 1', 'session-123')

      expect(vi.mocked(invoke)).toHaveBeenCalledWith('send_chat_message', expect.objectContaining({
        canvasName: 'My Canvas',
        nodeName: 'Node 1',
        sessionId: 'session-123',
      }))
    })

    it('should propagate error from backend', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce([
          {
            id: '1',
            name: 'Test LLM',
            api_url: 'https://api.example.com',
            api_key: 'key',
            model_name: 'gpt-4',
          },
        ])
        .mockRejectedValueOnce(new Error('Network error'))

      await expect(sendChatMessage('Hello')).rejects.toThrow('Network error')
    })

    it('should wrap non-Error exceptions', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce([
          {
            id: '1',
            name: 'Test LLM',
            api_url: 'https://api.example.com',
            api_key: 'key',
            model_name: 'gpt-4',
          },
        ])
        .mockRejectedValueOnce('Unknown error')

      await expect(sendChatMessage('Hello')).rejects.toThrow('发送消息失败: Unknown error')
    })
  })

  describe('sendChatRequest', () => {
    it('should throw error when config URL is empty', async () => {
      const config = {
        id: '1',
        name: 'Test',
        provider_type: 'openai' as const,
        api_url: '',
        api_key: 'key',
        model_name: 'gpt-4',
      }

      await expect(sendChatRequest({ messages: [{ role: 'user', content: 'Hi' }], config })).rejects.toThrow(
        'LLM API 配置不完整'
      )
    })

    it('should throw error when config key is empty', async () => {
      const config = {
        id: '1',
        name: 'Test',
        provider_type: 'openai' as const,
        api_url: 'https://api.example.com',
        api_key: '',
        model_name: 'gpt-4',
      }

      await expect(sendChatRequest({ messages: [{ role: 'user', content: 'Hi' }], config })).rejects.toThrow(
        'LLM API 配置不完整'
      )
    })

    it('should send request with last message content', async () => {
      vi.mocked(invoke).mockResolvedValueOnce('Response')

      const config = {
        id: '1',
        name: 'Test',
        provider_type: 'openai' as const,
        api_url: 'https://api.example.com',
        api_key: 'key',
        model_name: 'gpt-4',
      }

      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
      ]

      await sendChatRequest({ messages, config })

      expect(vi.mocked(invoke)).toHaveBeenCalledWith('send_chat_message', expect.objectContaining({
        message: 'Hello',
      }))
    })

    it('should handle empty messages array', async () => {
      vi.mocked(invoke).mockResolvedValueOnce('Response')

      const config = {
        id: '1',
        name: 'Test',
        provider_type: 'openai' as const,
        api_url: 'https://api.example.com',
        api_key: 'key',
        model_name: 'gpt-4',
      }

      await sendChatRequest({ messages: [], config })

      expect(vi.mocked(invoke)).toHaveBeenCalledWith('send_chat_message', expect.objectContaining({
        message: '',
      }))
    })
  })

  describe('invalidateLlmConfigCache', () => {
    it('should allow refetching configs after invalidation', async () => {
      // First call caches the result
      vi.mocked(invoke)
        .mockResolvedValueOnce([
          { id: '1', name: 'Test', provider_type: 'openai', api_url: 'url', api_key: 'key', model_name: 'gpt-4' },
        ])
        .mockResolvedValueOnce('response1')

      await sendChatMessage('Hello')

      // Invalidate cache
      invalidateLlmConfigCache()

      // Next call should fetch again
      vi.mocked(invoke)
        .mockResolvedValueOnce([
          { id: '1', name: 'Test', provider_type: 'openai', api_url: 'url', api_key: 'key', model_name: 'gpt-4' },
        ])
        .mockResolvedValueOnce('response2')

      await sendChatMessage('Hello again')

      // Should have called invoke twice for configs (once each time)
      expect(vi.mocked(invoke)).toHaveBeenCalledTimes(4)
    })
  })

  describe('sendChatMessageWithTools', () => {
    const mockTools: ToolDefinition[] = [
      {
        name: 'get_weather',
        description: 'Get weather for a location',
        input_schema: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'City name' },
          },
          required: ['location'],
        },
      },
    ]

    const mockMessages: LlmMessage[] = [
      { role: 'user', content: 'What is the weather in Beijing?' },
    ]

    it('should throw error when no LLM configs available', async () => {
      vi.mocked(invoke).mockResolvedValueOnce([])

      await expect(sendChatMessageWithTools(mockMessages, mockTools)).rejects.toThrow('请先在设置中配置 LLM API')
    })

    it('should throw error when API URL is empty', async () => {
      vi.mocked(invoke).mockResolvedValueOnce([
        {
          id: '1',
          name: 'Test LLM',
          api_url: '',
          api_key: 'key',
          model_name: 'gpt-4',
        },
      ])

      await expect(sendChatMessageWithTools(mockMessages, mockTools)).rejects.toThrow('LLM API 配置不完整')
    })

    it('should throw error when API key is empty', async () => {
      vi.mocked(invoke).mockResolvedValueOnce([
        {
          id: '1',
          name: 'Test LLM',
          api_url: 'https://api.example.com',
          api_key: '',
          model_name: 'gpt-4',
        },
      ])

      await expect(sendChatMessageWithTools(mockMessages, mockTools)).rejects.toThrow('LLM API 配置不完整')
    })

    it('should send message with tools successfully and return content', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce([
          {
            id: '1',
            name: 'Test LLM',
            api_url: 'https://api.example.com',
            api_key: 'test-key',
            model_name: 'gpt-4',
          },
        ])
        .mockResolvedValueOnce({ content: 'The weather in Beijing is sunny.' } as LlmResponse)

      const result = await sendChatMessageWithTools(mockMessages, mockTools)

      expect(result.content).toBe('The weather in Beijing is sunny.')
      expect(vi.mocked(invoke)).toHaveBeenCalledWith('send_chat_message_with_tools', expect.objectContaining({
        tools: mockTools.map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.input_schema,
          },
        })),
      }))
    })

    it('should return tool_calls when LLM requests tool execution', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce([
          {
            id: '1',
            name: 'Test LLM',
            api_url: 'https://api.example.com',
            api_key: 'test-key',
            model_name: 'gpt-4',
          },
        ])
        .mockResolvedValueOnce({
          content: null,
          tool_calls: [
            { id: 'call_123', type: 'function', function: { name: 'get_weather', arguments: { location: 'Beijing' } } },
          ],
        } as LlmResponse)

      const result = await sendChatMessageWithTools(mockMessages, mockTools)

      expect(result.tool_calls).toHaveLength(1)
      expect(result.tool_calls?.[0].function.name).toBe('get_weather')
      expect(result.tool_calls?.[0].function.arguments).toEqual({ location: 'Beijing' })
    })

    it('should pass optional parameters to backend', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce([
          {
            id: '1',
            name: 'Test LLM',
            api_url: 'https://api.example.com',
            api_key: 'key',
            model_name: 'gpt-4',
          },
        ])
        .mockResolvedValueOnce({ content: 'Response' } as LlmResponse)

      await sendChatMessageWithTools(mockMessages, mockTools, undefined, 'My Canvas', 'Node 1', 'session-123')

      expect(vi.mocked(invoke)).toHaveBeenCalledWith('send_chat_message_with_tools', expect.objectContaining({
        canvasName: 'My Canvas',
        nodeName: 'Node 1',
        sessionId: 'session-123',
      }))
    })

    it('should select specific model when modelName is provided', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce([
          { id: '1', name: 'Model A', api_url: 'https://api.example.com', api_key: 'key', model_name: 'gpt-4' },
          { id: '2', name: 'Model B', api_url: 'https://api.example.com', api_key: 'key', model_name: 'claude-3' },
        ])
        .mockResolvedValueOnce({ content: 'Response' } as LlmResponse)

      await sendChatMessageWithTools(mockMessages, mockTools, 'claude-3')

      expect(vi.mocked(invoke)).toHaveBeenCalledWith('send_chat_message_with_tools', expect.objectContaining({
        config: expect.objectContaining({ model_name: 'claude-3' }),
      }))
    })

    it('should propagate error from backend', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce([
          {
            id: '1',
            name: 'Test LLM',
            api_url: 'https://api.example.com',
            api_key: 'key',
            model_name: 'gpt-4',
          },
        ])
        .mockRejectedValueOnce(new Error('Network error'))

      // Error objects are re-thrown as-is, not wrapped
      await expect(sendChatMessageWithTools(mockMessages, mockTools)).rejects.toThrow('Network error')
    })

    it('should wrap non-Error exceptions', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce([
          {
            id: '1',
            name: 'Test LLM',
            api_url: 'https://api.example.com',
            api_key: 'key',
            model_name: 'gpt-4',
          },
        ])
        .mockRejectedValueOnce('Unknown error')

      await expect(sendChatMessageWithTools(mockMessages, mockTools)).rejects.toThrow('发送消息失败: Unknown error')
    })

    it('should handle messages with existing tool_calls', async () => {
      const messagesWithToolCalls: LlmMessage[] = [
        { role: 'user', content: 'What is the weather?' },
        {
          role: 'assistant',
          content: '',
          tool_calls: [{ id: 'call_123', type: 'function', function: { name: 'get_weather', arguments: { location: 'Beijing' } } }],
        },
        { role: 'tool', content: '{"temperature":25}', tool_call_id: 'call_123', tool_calls: [{ id: 'call_123', type: 'function', function: { name: 'get_weather', arguments: { location: 'Beijing' } } }] },
      ]

      vi.mocked(invoke)
        .mockResolvedValueOnce([
          { id: '1', name: 'Test', api_url: 'https://api.example.com', api_key: 'key', model_name: 'gpt-4' },
        ])
        .mockResolvedValueOnce({ content: 'The weather in Beijing is 25 degrees.' } as LlmResponse)

      const result = await sendChatMessageWithTools(messagesWithToolCalls, mockTools)

      expect(result.content).toBe('The weather in Beijing is 25 degrees.')
    })
  })
})
