import type { Node, Edge } from '@xyflow/react'

/**
 * Extract content from a node based on its type
 */
export function extractNodeContent(node: Node): string {
  const data = node.data as {
    type: 'text' | 'image' | 'video' | 'audio'
    content?: string
    imageUrl?: string
    videoUrl?: string
    audioUrl?: string
  }

  switch (data.type) {
    case 'text':
      return data.content || ''
    case 'image':
      return `[图片] ${data.imageUrl || '无URL'}`
    case 'video':
      return `[视频] ${data.videoUrl || '无URL'}`
    case 'audio':
      return `[音频] ${data.audioUrl || '无URL'}`
    default:
      return JSON.stringify(data)
  }
}

export interface UpstreamNode {
  nodeId: string
  nodeLabel: string
  content: string
  type: 'text' | 'image' | 'video' | 'audio'
  distance: number            // 跳数
}

export class UpstreamContextManager {
  /**
   * 获取指定节点的所有上游节点内容
   * @param nodeId 目标节点ID
   * @param nodes 所有节点
   * @param edges 所有边
   * @param maxDepth 最大追溯深度，默认2
   */
  static getUpstreamContent(
    nodeId: string,
    nodes: Node[],
    edges: Edge[],
    maxDepth: number = 2
  ): UpstreamNode[] {
    const visited = new Set<string>()
    const result: UpstreamNode[] = []

    // Build node lookup map for O(1) access
    const nodeMap = new Map(nodes.map(n => [n.id, n]))

    this.traverse(nodeId, 0, maxDepth, visited, result, nodeMap, edges)

    return result
  }

  private static traverse(
    currentId: string,
    currentDepth: number,
    maxDepth: number,
    visited: Set<string>,
    result: UpstreamNode[],
    nodeMap: Map<string, Node>,
    edges: Edge[]
  ) {
    if (visited.has(currentId) || currentDepth > maxDepth) return
    visited.add(currentId)

    // 查找所有上游节点（直接连接到当前节点的source）
    const upstreamEdges = edges.filter(e => e.target === currentId)

    for (const edge of upstreamEdges) {
      const sourceNode = nodeMap.get(edge.source)
      if (!sourceNode) continue

      result.push({
        nodeId: sourceNode.id,
        nodeLabel: sourceNode.data.label as string,
        content: extractNodeContent(sourceNode),
        type: sourceNode.data.type as 'text' | 'image' | 'video' | 'audio',
        distance: currentDepth + 1
      })

      // 递归追溯更上游的节点
      this.traverse(sourceNode.id, currentDepth + 1, maxDepth, visited, result, nodeMap, edges)
    }
  }

  /**
   * 构建发送给LLM的上下文字符串
   */
  static buildContextPrompt(upstreamNodes: UpstreamNode[]): string {
    if (upstreamNodes.length === 0) {
      return '（无可用上游内容）'
    }

    const lines = upstreamNodes.map((node, index) => {
      return `[来源${index + 1}: ${node.nodeLabel}] (距离${node.distance}跳)\n${node.content}`
    })

    return lines.join('\n\n')
  }
}
