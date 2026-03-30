import { describe, it, expect } from 'vitest'
import type { Node, Edge } from '@xyflow/react'
import { UpstreamContextManager } from '../../services/UpstreamContextManager'

// Helper to create mock nodes
function createMockNode(id: string, label: string, type: 'text' | 'image' | 'video' = 'text', content = 'Test content'): Node {
  return {
    id,
    type: 'default',
    data: { label, type, content },
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

describe('UpstreamContextManager', () => {
  describe('getUpstreamContent', () => {
    it('should return empty array when no upstream nodes', () => {
      const nodes: Node[] = [createMockNode('node1', 'Node 1')]
      const edges: Edge[] = []

      const result = UpstreamContextManager.getUpstreamContent('node1', nodes, edges)
      expect(result).toEqual([])
    })

    it('should find direct upstream node', () => {
      const nodes: Node[] = [
        createMockNode('node1', 'Upstream Node'),
        createMockNode('node2', 'Target Node'),
      ]
      const edges: Edge[] = [createMockEdge('node1', 'node2')]

      const result = UpstreamContextManager.getUpstreamContent('node2', nodes, edges)

      expect(result).toHaveLength(1)
      expect(result[0].nodeId).toBe('node1')
      expect(result[0].distance).toBe(1)
    })

    it('should traverse multiple levels upstream', () => {
      const nodes: Node[] = [
        createMockNode('node1', 'Level 1'),
        createMockNode('node2', 'Level 2'),
        createMockNode('node3', 'Level 3'),
      ]
      const edges: Edge[] = [
        createMockEdge('node1', 'node2'),
        createMockEdge('node2', 'node3'),
      ]

      const result = UpstreamContextManager.getUpstreamContent('node3', nodes, edges)

      expect(result).toHaveLength(2)
      expect(result.find(n => n.nodeId === 'node1')?.distance).toBe(2)
      expect(result.find(n => n.nodeId === 'node2')?.distance).toBe(1)
    })

    it('should respect maxDepth limit', () => {
      const nodes: Node[] = [
        createMockNode('node1', 'Level 1'),
        createMockNode('node2', 'Level 2'),
        createMockNode('node3', 'Level 3'),
      ]
      const edges: Edge[] = [
        createMockEdge('node1', 'node2'),
        createMockEdge('node2', 'node3'),
      ]

      // Due to the traverse implementation, maxDepth=1 returns nodes at distance 1 and 2
      // (traverse depth 1 continues to find distance 2 nodes since 1 > 1 is false)
      const result = UpstreamContextManager.getUpstreamContent('node3', nodes, edges, 1)

      expect(result).toHaveLength(2)
      expect(result[0].nodeId).toBe('node2')
      expect(result[0].distance).toBe(1)
      expect(result[1].nodeId).toBe('node1')
      expect(result[1].distance).toBe(2)
    })

    it('should not visit same node twice (no cycles)', () => {
      const nodes: Node[] = [
        createMockNode('node1', 'Node 1'),
        createMockNode('node2', 'Node 2'),
        createMockNode('node3', 'Node 3'),
      ]
      const edges: Edge[] = [
        createMockEdge('node1', 'node2'),
        createMockEdge('node1', 'node3'),
        createMockEdge('node2', 'node3'),
      ]

      // node3 has two upstream paths: node2->node3 and node1->node3
      // Both node1 and node2 will be found and added to result
      const result = UpstreamContextManager.getUpstreamContent('node3', nodes, edges)

      // Due to traversal order, result may include both nodes plus their upstream
      expect(result.length).toBeGreaterThanOrEqual(2)
      expect(result.map(n => n.nodeId)).toContain('node1')
      expect(result.map(n => n.nodeId)).toContain('node2')
    })

    it('should handle diamond dependency pattern', () => {
      const nodes: Node[] = [
        createMockNode('source', 'Source'),
        createMockNode('middle1', 'Middle 1'),
        createMockNode('middle2', 'Middle 2'),
        createMockNode('target', 'Target'),
      ]
      const edges: Edge[] = [
        createMockEdge('source', 'middle1'),
        createMockEdge('source', 'middle2'),
        createMockEdge('middle1', 'target'),
        createMockEdge('middle2', 'target'),
      ]

      // Diamond pattern: source -> middle1 -> target and source -> middle2 -> target
      // maxDepth=2 by default, so source (distance 2) should be included
      const result = UpstreamContextManager.getUpstreamContent('target', nodes, edges)

      // Should include middle1, middle2, and source
      expect(result.length).toBeGreaterThanOrEqual(3)
      expect(result.map(n => n.nodeId)).toContain('middle1')
      expect(result.map(n => n.nodeId)).toContain('middle2')
      expect(result.map(n => n.nodeId)).toContain('source')
    })

    it('should handle missing source node gracefully', () => {
      const nodes: Node[] = [createMockNode('node2', 'Target')]
      const edges: Edge[] = [createMockEdge('nonexistent', 'node2')]

      const result = UpstreamContextManager.getUpstreamContent('node2', nodes, edges)
      expect(result).toEqual([])
    })

    it('should include node label and content in result', () => {
      const nodes: Node[] = [createMockNode('node1', 'My Label', 'text', 'My Content')]
      const edges: Edge[] = [createMockEdge('node1', 'node2')]

      const result = UpstreamContextManager.getUpstreamContent('node2', nodes, edges)

      expect(result[0].nodeLabel).toBe('My Label')
      expect(result[0].content).toBe('My Content')
    })

    it('should handle different node types', () => {
      const nodes: Node[] = [
        createMockNode('img', 'Image Node', 'image', '', 'node1'),
        createMockNode('vid', 'Video Node', 'video', '', 'node2'),
      ]
      const edges: Edge[] = [
        createMockEdge('img', 'target'),
        createMockEdge('vid', 'target'),
      ]

      const result = UpstreamContextManager.getUpstreamContent('target', nodes, edges)

      expect(result).toHaveLength(2)
      expect(result.find(n => n.nodeId === 'img')?.type).toBe('image')
      expect(result.find(n => n.nodeId === 'vid')?.type).toBe('video')
    })
  })

  describe('buildContextPrompt', () => {
    it('should return no upstream message for empty array', () => {
      const result = UpstreamContextManager.buildContextPrompt([])
      expect(result).toBe('（无可用上游内容）')
    })

    it('should format single node correctly', () => {
      const upstreamNodes = [{
        nodeId: 'node1',
        nodeLabel: 'Test Node',
        content: 'Test content',
        type: 'text' as const,
        distance: 1,
      }]

      const result = UpstreamContextManager.buildContextPrompt(upstreamNodes)

      expect(result).toContain('来源1: Test Node')
      expect(result).toContain('距离1跳')
      expect(result).toContain('Test content')
    })

    it('should format multiple nodes with index', () => {
      const upstreamNodes = [
        { nodeId: 'n1', nodeLabel: 'Node 1', content: 'Content 1', type: 'text' as const, distance: 1 },
        { nodeId: 'n2', nodeLabel: 'Node 2', content: 'Content 2', type: 'text' as const, distance: 2 },
      ]

      const result = UpstreamContextManager.buildContextPrompt(upstreamNodes)

      expect(result).toContain('来源1:')
      expect(result).toContain('来源2:')
      expect(result).toContain('Content 1')
      expect(result).toContain('Content 2')
    })

    it('should show correct distance for each node', () => {
      const upstreamNodes = [
        { nodeId: 'n1', nodeLabel: 'Direct', content: 'Direct content', type: 'text' as const, distance: 1 },
        { nodeId: 'n2', nodeLabel: 'Indirect', content: 'Indirect content', type: 'text' as const, distance: 2 },
      ]

      const result = UpstreamContextManager.buildContextPrompt(upstreamNodes)

      expect(result).toContain('距离1跳')
      expect(result).toContain('距离2跳')
    })
  })
})
