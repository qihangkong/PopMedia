import { describe, it, expect, vi, beforeEach } from 'vitest'
import { invoke } from '@tauri-apps/api/core'

// Mock @tauri-apps/api/core first
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

// Import the module under test
import { sendChatMessage, sendChatRequest, invalidateLlmConfigCache, type ChatMessage } from '../../utils/chatApi'

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
          { id: '1', name: 'Test', api_url: 'url', api_key: 'key', model_name: 'gpt-4' },
        ])
        .mockResolvedValueOnce('response1')

      await sendChatMessage('Hello')

      // Invalidate cache
      invalidateLlmConfigCache()

      // Next call should fetch again
      vi.mocked(invoke)
        .mockResolvedValueOnce([
          { id: '1', name: 'Test', api_url: 'url', api_key: 'key', model_name: 'gpt-4' },
        ])
        .mockResolvedValueOnce('response2')

      await sendChatMessage('Hello again')

      // Should have called invoke twice for configs (once each time)
      expect(vi.mocked(invoke)).toHaveBeenCalledTimes(4)
    })
  })
})
