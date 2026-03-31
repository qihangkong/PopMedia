import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Node, Edge } from '@xyflow/react'
import { AIExecutionEngine, ChatMode } from '../../services/AIExecutionEngine'

// Mock the chatApi module
vi.mock('../../utils/chatApi', () => ({
  sendChatMessage: vi.fn().mockImplementation((_content: string, _model?: string) => {
    return Promise.resolve('mock AI response')
  }),
  sendChatMessageWithTools: vi.fn().mockImplementation((_messages, _tools, _model?, _canvas?, _node?, _session?) => {
    // Default mock returns a response without tool_calls (final response)
    return Promise.resolve({
      content: 'mock AI response',
      tool_calls: undefined,
      error: undefined,
    })
  }),
}))

import { sendChatMessage, sendChatMessageWithTools } from '../../utils/chatApi'

// Helper to create mock nodes
function createMockNode(id: string, label: string, content = 'Test content'): Node {
  return {
    id,
    type: 'default',
    data: { label, type: 'text', content } as Record<string, unknown>,
    position: { x: 0, y: 0 },
  }
}

describe('AIExecutionEngine', () => {
  let engine: AIExecutionEngine

  beforeEach(() => {
    engine = new AIExecutionEngine()
    vi.clearAllMocks()
  })

  describe('execute', () => {
    it('should route to global chat for GLOBAL_CHAT mode', async () => {
      // GLOBAL_CHAT throws error as it's not yet implemented in agentic style
      await expect(engine.execute({
        mode: ChatMode.GLOBAL_CHAT,
        userInput: 'Hello AI',
      })).rejects.toThrow('Global chat mode not yet implemented in agentic style')
    })

    it('should route to node execution for NODE mode (agentic)', async () => {
      const nodes = [createMockNode('node1', 'Test Node', 'content')]
      const edges: Edge[] = []

      const onStateChange = vi.fn()

      const result = await engine.execute({
        mode: ChatMode.NODE_AGENTIC,
        userInput: 'process this',
        nodeId: 'node1',
        nodes,
        edges,
        onStateChange,
      })

      expect(result).toBe('mock AI response')
      // Should use sendChatMessageWithTools for agentic mode
      expect(sendChatMessageWithTools).toHaveBeenCalled()
    })

    it('should throw error for unknown mode', async () => {
      await expect(engine.execute({
        // @ts-expect-error testing invalid mode
        mode: 'unknown',
        userInput: 'test',
      })).rejects.toThrow('Unknown mode: unknown')
    })
  })

  describe('executeNodeTask (agentic mode)', () => {
    it('should throw error when nodeId is missing', async () => {
      const nodes = [createMockNode('node1', 'Test')]
      const edges: Edge[] = []

      await expect(engine.execute({
        mode: ChatMode.NODE_AGENTIC,
        userInput: 'test',
        nodeId: undefined,
        nodes,
        edges,
      })).rejects.toThrow('Node task requires nodeId, nodes and edges')
    })

    it('should throw error when nodes is missing', async () => {
      await expect(engine.execute({
        mode: ChatMode.NODE_AGENTIC,
        userInput: 'test',
        nodeId: 'node1',
        nodes: undefined,
        edges: [],
      })).rejects.toThrow('Node task requires nodeId, nodes and edges')
    })

    it('should throw error when edges is missing', async () => {
      const nodes = [createMockNode('node1', 'Test')]

      await expect(engine.execute({
        mode: ChatMode.NODE_AGENTIC,
        userInput: 'test',
        nodeId: 'node1',
        nodes,
        edges: undefined,
      })).rejects.toThrow('Node task requires nodeId, nodes and edges')
    })

    it('should throw error when node is not found', async () => {
      const nodes = [createMockNode('node1', 'Test')]
      const edges: Edge[] = []

      await expect(engine.execute({
        mode: ChatMode.NODE_AGENTIC,
        userInput: 'test',
        nodeId: 'nonexistent',
        nodes,
        edges,
      })).rejects.toThrow('Node not found: nonexistent')
    })

    it('should call onStateChange with pending then generating', async () => {
      const nodes = [createMockNode('node1', 'Test', 'content')]
      const edges: Edge[] = []
      const onStateChange = vi.fn()

      await engine.execute({
        mode: ChatMode.NODE_AGENTIC,
        userInput: 'test',
        nodeId: 'node1',
        nodes,
        edges,
        onStateChange,
      })

      // First call should be pending with AI分析中
      expect(onStateChange).toHaveBeenCalledWith({ status: 'pending', progress: 'AI分析中...' })
    })

    it('should call onStateChange with completed on success', async () => {
      const nodes = [createMockNode('node1', 'Test', 'content')]
      const edges: Edge[] = []
      const onStateChange = vi.fn()

      await engine.execute({
        mode: ChatMode.NODE_AGENTIC,
        userInput: 'test',
        nodeId: 'node1',
        nodes,
        edges,
        onStateChange,
      })

      const lastCall = onStateChange.mock.calls[onStateChange.mock.calls.length - 1][0]
      expect(lastCall.status).toBe('completed')
      expect(lastCall.result).toBe('mock AI response')
    })

    it('should call onStateChange with error on failure', async () => {
      vi.mocked(sendChatMessageWithTools).mockRejectedValueOnce(new Error('API error'))

      const nodes = [createMockNode('node1', 'Test', 'content')]
      const edges: Edge[] = []
      const onStateChange = vi.fn()

      await expect(engine.execute({
        mode: ChatMode.NODE_AGENTIC,
        userInput: 'test',
        nodeId: 'node1',
        nodes,
        edges,
        onStateChange,
      })).rejects.toThrow('API error')

      const lastCall = onStateChange.mock.calls[onStateChange.mock.calls.length - 1][0]
      expect(lastCall.status).toBe('error')
      expect(lastCall.error).toBe('API error')
    })

    it('should use sendChatMessageWithTools for agentic mode', async () => {
      const nodes = [createMockNode('node1', 'Test', 'content')]
      const edges: Edge[] = []

      await engine.execute({
        mode: ChatMode.NODE_AGENTIC,
        userInput: 'test',
        nodeId: 'node1',
        nodes,
        edges,
      })

      expect(sendChatMessageWithTools).toHaveBeenCalled()
      expect(sendChatMessage).not.toHaveBeenCalled()
    })

    it('should handle tool_calls in agentic loop', async () => {
      // Mock that LLM returns a tool_call
      vi.mocked(sendChatMessageWithTools).mockResolvedValueOnce({
        content: '',
        tool_calls: [
          { name: 'read_node', arguments: { nodeId: 'node1' } }
        ],
        error: undefined,
      }).mockResolvedValueOnce({
        content: 'final response after tool',
        tool_calls: undefined,
        error: undefined,
      })

      const nodes = [createMockNode('node1', 'Test', 'content')]
      const edges: Edge[] = []

      const result = await engine.execute({
        mode: ChatMode.NODE_AGENTIC,
        userInput: 'read the node',
        nodeId: 'node1',
        nodes,
        edges,
      })

      expect(result).toBe('final response after tool')
      // Should have called twice - once for tool call, once for final response
      expect(sendChatMessageWithTools).toHaveBeenCalledTimes(2)
    })
  })

  describe('executeGlobalChat', () => {
    it('should throw error as not yet implemented', async () => {
      await expect(engine.executeGlobalChat('Hello world')).rejects.toThrow(
        'Global chat mode not yet implemented in agentic style'
      )
    })
  })
})
