import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Node, Edge } from '@xyflow/react'
import { AIExecutionEngine, ChatMode } from '../../services/AIExecutionEngine'
import type { NodeData } from '../../types'

// Mock the chatApi module
vi.mock('../../utils/chatApi', () => ({
  sendChatMessage: vi.fn().mockImplementation((_content: string, _model?: string) => {
    return Promise.resolve('mock AI response')
  }),
}))

import { sendChatMessage } from '../../utils/chatApi'

// Helper to create mock nodes
function createMockNode(id: string, label: string, content = 'Test content'): Node {
  return {
    id,
    type: 'default',
    data: { label, type: 'text', content } as NodeData,
    position: { x: 0, y: 0 },
  }
}

// Helper to create mock edges
function createMockEdge(source: string, target: string): Edge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    type: 'default',
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
      const result = await engine.execute({
        mode: ChatMode.GLOBAL_CHAT,
        userInput: 'Hello AI',
      })

      expect(result).toBe('mock AI response')
      expect(sendChatMessage).toHaveBeenCalled()
      // Check the first argument was passed correctly
      expect(sendChatMessage).toHaveBeenCalledWith('Hello AI')
    })

    it('should route to node execution for NODE_EXECUTE mode', async () => {
      const nodes = [createMockNode('node1', 'Test Node', 'content')]
      const edges: Edge[] = []

      const onStateChange = vi.fn()

      const result = await engine.execute({
        mode: ChatMode.NODE_EXECUTE,
        userInput: 'process this',
        nodeId: 'node1',
        nodes,
        edges,
        onStateChange,
      })

      expect(result).toBe('mock AI response')
    })

    it('should route to cross-node execution for CROSS_NODE mode', async () => {
      const nodes = [createMockNode('node1', 'Node 1'), createMockNode('node2', 'Node 2')]

      const result = await engine.execute({
        mode: ChatMode.CROSS_NODE,
        userInput: 'compare these',
        mentionNodeIds: ['node1', 'node2'],
        nodes,
      })

      expect(result).toBe('mock AI response')
    })

    it('should throw error for unknown mode', async () => {
      await expect(engine.execute({
        // @ts-expect-error testing invalid mode
        mode: 'unknown',
        userInput: 'test',
      })).rejects.toThrow('Unknown mode: unknown')
    })
  })

  describe('executeNodeTask', () => {
    it('should throw error when nodeId is missing', async () => {
      const nodes = [createMockNode('node1', 'Test')]
      const edges: Edge[] = []

      await expect(engine.execute({
        mode: ChatMode.NODE_EXECUTE,
        userInput: 'test',
        nodeId: undefined,
        nodes,
        edges,
      })).rejects.toThrow('Node task requires nodeId, nodes and edges')
    })

    it('should throw error when nodes is missing', async () => {
      await expect(engine.execute({
        mode: ChatMode.NODE_EXECUTE,
        userInput: 'test',
        nodeId: 'node1',
        nodes: undefined,
        edges: [],
      })).rejects.toThrow('Node task requires nodeId, nodes and edges')
    })

    it('should throw error when edges is missing', async () => {
      const nodes = [createMockNode('node1', 'Test')]

      await expect(engine.execute({
        mode: ChatMode.NODE_EXECUTE,
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
        mode: ChatMode.NODE_EXECUTE,
        userInput: 'test',
        nodeId: 'nonexistent',
        nodes,
        edges,
      })).rejects.toThrow('Node not found: nonexistent')
    })

    it('should call onStateChange with pending during intent analysis', async () => {
      const nodes = [createMockNode('node1', 'Test', 'content')]
      const edges: Edge[] = []
      const onStateChange = vi.fn()

      await engine.execute({
        mode: ChatMode.NODE_EXECUTE,
        userInput: 'summarize this',
        nodeId: 'node1',
        nodes,
        edges,
        onStateChange,
      })

      expect(onStateChange).toHaveBeenCalledWith({ status: 'pending', progress: '分析意图...' })
    })

    it('should call onStateChange with pending when getting upstream content', async () => {
      const nodes = [createMockNode('node1', 'Test', 'content')]
      const edges: Edge[] = []
      const onStateChange = vi.fn()

      await engine.execute({
        mode: ChatMode.NODE_EXECUTE,
        userInput: 'summarize upstream',
        nodeId: 'node1',
        nodes,
        edges,
        onStateChange,
      })

      // Should have called with getting upstream content since intent.needsUpstream is true
      expect(onStateChange).toHaveBeenCalledWith({ status: 'pending', progress: '获取上游内容...' })
    })

    it('should use custom model when provided', async () => {
      const nodes = [createMockNode('node1', 'Test', 'content')]
      const edges: Edge[] = []

      await engine.execute({
        mode: ChatMode.NODE_EXECUTE,
        userInput: 'test',
        nodeId: 'node1',
        nodes,
        edges,
        model: 'custom-model',
      })

      expect(sendChatMessage).toHaveBeenCalledWith(expect.any(String), 'custom-model')
    })

    it('should call onStateChange with completed on success', async () => {
      const nodes = [createMockNode('node1', 'Test', 'content')]
      const edges: Edge[] = []
      const onStateChange = vi.fn()

      await engine.execute({
        mode: ChatMode.NODE_EXECUTE,
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
      vi.mocked(sendChatMessage).mockRejectedValueOnce(new Error('API error'))

      const nodes = [createMockNode('node1', 'Test', 'content')]
      const edges: Edge[] = []
      const onStateChange = vi.fn()

      await expect(engine.execute({
        mode: ChatMode.NODE_EXECUTE,
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
  })

  describe('executeGlobalChat', () => {
    it('should send message without context', async () => {
      const result = await engine.executeGlobalChat('Hello world')

      expect(result).toBe('mock AI response')
      expect(sendChatMessage).toHaveBeenCalled()
      // executeGlobalChat calls sendChatMessage with only one argument
      expect(sendChatMessage).toHaveBeenCalledWith('Hello world')
    })
  })

  describe('executeCrossNode', () => {
    it('should throw error when mentionNodeIds is missing', async () => {
      const nodes = [createMockNode('node1', 'Node 1')]

      await expect(engine.executeCrossNode('compare', undefined, nodes)).rejects.toThrow(
        'Cross-node task requires mentionNodeIds and nodes'
      )
    })

    it('should throw error when nodes is missing', async () => {
      await expect(engine.executeCrossNode('compare', ['node1'], undefined)).rejects.toThrow(
        'Cross-node task requires mentionNodeIds and nodes'
      )
    })

    it('should build context from mentioned nodes', async () => {
      const nodes = [
        createMockNode('node1', 'First Node', 'Content A'),
        createMockNode('node2', 'Second Node', 'Content B'),
      ]
      const onStateChange = vi.fn()

      await engine.executeCrossNode('compare these', ['node1', 'node2'], nodes, undefined, onStateChange)

      expect(sendChatMessage).toHaveBeenCalledWith(
        expect.stringContaining('[First Node]'),
        undefined
      )
      expect(sendChatMessage).toHaveBeenCalledWith(
        expect.stringContaining('Content A'),
        undefined
      )
    })

    it('should notify progress when getting referenced content', async () => {
      const nodes = [
        createMockNode('node1', 'Node 1', 'Content'),
      ]
      const onStateChange = vi.fn()

      await engine.executeCrossNode('use this', ['node1'], nodes, undefined, onStateChange)

      expect(onStateChange).toHaveBeenCalledWith({
        status: 'pending',
        progress: '获取引用节点内容...',
      })
    })

    it('should use specified model', async () => {
      const nodes = [createMockNode('node1', 'Node', 'content')]

      await engine.executeCrossNode('use', ['node1'], nodes, 'gpt-4')

      expect(sendChatMessage).toHaveBeenCalledWith(expect.any(String), 'gpt-4')
    })
  })
})
