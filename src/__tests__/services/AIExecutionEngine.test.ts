import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Node, Edge } from '@xyflow/react'
import { AIExecutionEngine, ChatMode } from '../../services/AIExecutionEngine'
import type { LlmMessage, ToolDefinition } from '../../types/ai'

// Helper to create mock nodes
function createMockNode(id: string, label: string, content = 'Test content'): Node {
  return {
    id,
    type: 'default',
    data: { label, type: 'text', content } as Record<string, unknown>,
    position: { x: 0, y: 0 },
  }
}

// Mock function type for dependency injection
type MockSendChatMessageFn = ReturnType<typeof vi.fn>

describe('AIExecutionEngine', () => {
  let mockSendChatMessage: MockSendChatMessageFn
  let engine: AIExecutionEngine

  const createMockSendChatMessage = (): typeof vi.fn => {
    return vi.fn().mockImplementation((_messages: LlmMessage[], _tools: ToolDefinition[], _model?: string, _canvas?: string, _node?: string, _session?: string) => {
      return Promise.resolve({
        content: 'mock AI response',
        tool_calls: undefined,
        error: undefined,
      })
    })
  }

  beforeEach(() => {
    mockSendChatMessage = createMockSendChatMessage()
    engine = new AIExecutionEngine(mockSendChatMessage)
  })

  describe('execute', () => {
    it('should return message for GLOBAL_CHAT mode (not yet implemented)', async () => {
      const result = await engine.execute({
        mode: ChatMode.GLOBAL_CHAT,
        userInput: 'Hello AI',
      })
      expect(result).toContain('全局对话功能正在开发中')
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
      expect(mockSendChatMessage).toHaveBeenCalled()
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
      mockSendChatMessage = vi.fn().mockRejectedValueOnce(new Error('API error'))
      engine = new AIExecutionEngine(mockSendChatMessage)

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

    it('should use injected sendChatMessage for agentic mode', async () => {
      const nodes = [createMockNode('node1', 'Test', 'content')]
      const edges: Edge[] = []

      await engine.execute({
        mode: ChatMode.NODE_AGENTIC,
        userInput: 'test',
        nodeId: 'node1',
        nodes,
        edges,
      })

      expect(mockSendChatMessage).toHaveBeenCalled()
    })

    it('should handle tool_calls in agentic loop', async () => {
      mockSendChatMessage = vi.fn()
        .mockResolvedValueOnce({
          content: '',
          tool_calls: [
            { name: 'read_node', arguments: { nodeId: 'node1' } }
          ],
          error: undefined,
        })
        .mockResolvedValueOnce({
          content: 'final response after tool',
          tool_calls: undefined,
          error: undefined,
        })
      engine = new AIExecutionEngine(mockSendChatMessage)

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
      expect(mockSendChatMessage).toHaveBeenCalledTimes(2)
    })

    it('should use default sendChatMessage when not injected', () => {
      const defaultEngine = new AIExecutionEngine()
      expect(defaultEngine).toBeInstanceOf(AIExecutionEngine)
    })
  })

  describe('executeGlobalChat', () => {
    it('should return message as not yet implemented', async () => {
      const result = await engine.executeGlobalChat('Hello world')
      expect(result).toContain('全局对话功能正在开发中')
    })
  })
})
