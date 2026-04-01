import type { Node, Edge } from '@xyflow/react'
import type { NodeData, NodeType } from '../types'
import { getNodeContent } from '../types'
import type { ToolDefinition, ToolCall, ToolResult } from '../types/ai'
import { skillRegistry } from './SkillRegistry'

/**
 * Upstream node info (without content - for AI to decide what to read)
 */
export interface UpstreamNodeInfo {
  nodeId: string
  nodeLabel: string
  type: NodeType
  distance: number
}

/**
 * ToolRegistry - Manages all tools available to the AI
 *
 * Stateless - canvas state is passed to each method
 * Provides:
 * - Node tools: read_node, write_node, list_nodes, get_upstream
 * - Skill tools: converted from SkillRegistry
 */
export class ToolRegistry {

  /**
   * Get all node tool definitions
   */
  getNodeTools(): ToolDefinition[] {
    return [
      {
        name: 'read_node',
        description: '读取指定节点的内容。返回节点的完整内容。',
        input_schema: {
          type: 'object',
          properties: {
            nodeId: {
              type: 'string',
              description: '要读取的节点ID'
            }
          },
          required: ['nodeId']
        }
      },
      {
        name: 'write_node',
        description: '向指定节点写入内容。如果节点不存在则返回错误。',
        input_schema: {
          type: 'object',
          properties: {
            nodeId: {
              type: 'string',
              description: '要写入的节点ID'
            },
            content: {
              type: 'string',
              description: '要写入的内容'
            }
          },
          required: ['nodeId', 'content']
        }
      },
      {
        name: 'list_nodes',
        description: '列出当前画布中所有节点的基本信息（ID、标签、类型）。用于了解画布结构。',
        input_schema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'get_upstream',
        description: '获取指定节点的上游节点信息（不包含内容）。用于了解节点的数据依赖关系。',
        input_schema: {
          type: 'object',
          properties: {
            nodeId: {
              type: 'string',
              description: '目标节点ID'
            },
            maxDepth: {
              type: 'number',
              description: '最大追溯深度，默认2',
              default: 2
            }
          },
          required: ['nodeId']
        }
      }
    ]
  }

  /**
   * Get skill tools converted from SkillRegistry
   */
  getSkillTools(): ToolDefinition[] {
    const skills = skillRegistry.getAll()
    return skills.map(skill => ({
      name: skill.id,
      description: skill.description,
      input_schema: {
        type: 'object',
        properties: {
          input: {
            type: 'string',
            description: '需要处理的输入内容'
          }
        },
        required: ['input']
      }
    }))
  }

  /**
   * Get all available tools (node tools + skill tools)
   */
  getAllTools(): ToolDefinition[] {
    return [...this.getNodeTools(), ...this.getSkillTools()]
  }

  /**
   * Check if a tool name is a skill tool
   */
  isSkillTool(name: string): boolean {
    return skillRegistry.findById(name) !== null
  }

  /**
   * Find a node by ID in the given nodes array
   */
  private findNode(nodeId: string, nodes: Node[]): Node | undefined {
    return nodes.find(n => n.id === nodeId)
  }

  /**
   * Execute a tool call with the given canvas state
   */
  async executeTool(toolCall: ToolCall, nodes: Node[], edges: Edge[]): Promise<ToolResult> {
    const { name, arguments: args } = toolCall.function
    // Parse arguments if it's a JSON string
    const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args

    try {
      switch (name) {
        case 'read_node':
          return this.executeReadNode(parsedArgs, nodes)
        case 'write_node':
          return this.executeWriteNode(parsedArgs, nodes)
        case 'list_nodes':
          return this.executeListNodes(parsedArgs, nodes)
        case 'get_upstream':
          return this.executeGetUpstream(parsedArgs, nodes, edges)
        default:
          // Check if it's a skill tool
          if (skillRegistry.findById(name)) {
            return this.executeSkillTool(name, parsedArgs)
          }
          return {
            name,
            output: '',
            error: `Unknown tool: ${name}`
          }
      }
    } catch (err) {
      return {
        name,
        output: '',
        error: err instanceof Error ? err.message : String(err)
      }
    }
  }

  /**
   * Execute multiple tool calls with the given canvas state
   */
  async executeToolCalls(toolCalls: ToolCall[], nodes: Node[], edges: Edge[]): Promise<ToolResult[]> {
    const results: ToolResult[] = []
    for (const toolCall of toolCalls) {
      const result = await this.executeTool(toolCall, nodes, edges)
      results.push(result)
    }
    return results
  }

  // ========== Tool Executors ==========

  private executeReadNode(args: Record<string, unknown>, nodes: Node[]): ToolResult {
    const nodeId = args.nodeId as string
    if (!nodeId) {
      return { name: 'read_node', output: '', error: 'nodeId is required' }
    }

    const node = this.findNode(nodeId, nodes)
    if (!node) {
      return { name: 'read_node', output: '', error: `Node not found: ${nodeId}` }
    }

    const nodeData = node.data as unknown as NodeData
    const content = getNodeContent(nodeData)

    return {
      name: 'read_node',
      output: JSON.stringify({
        nodeId: node.id,
        label: nodeData.label,
        type: nodeData.type,
        content
      })
    }
  }

  private executeWriteNode(args: Record<string, unknown>, nodes: Node[]): ToolResult {
    const nodeId = args.nodeId as string
    const content = args.content as string

    if (!nodeId) {
      return { name: 'write_node', output: '', error: 'nodeId is required' }
    }
    if (content === undefined) {
      return { name: 'write_node', output: '', error: 'content is required' }
    }

    const node = this.findNode(nodeId, nodes)
    if (!node) {
      return { name: 'write_node', output: '', error: `Node not found: ${nodeId}` }
    }

    const nodeData = node.data as unknown as NodeData

    if (nodeData.type === 'text' || nodeData.type === 'script' || nodeData.type === 'block') {
      return {
        name: 'write_node',
        output: JSON.stringify({
          success: true,
          nodeId,
          message: `Content written to node "${nodeData.label}"`
        })
      }
    }

    return {
      name: 'write_node',
      output: '',
      error: `Unsupported node type for writing: ${nodeData.type}`
    }
  }

  private executeListNodes(_args: Record<string, unknown>, nodes: Node[]): ToolResult {
    const nodeInfos = nodes.map(n => {
      const data = n.data as unknown as NodeData
      return {
        nodeId: n.id,
        label: data.label,
        type: data.type
      }
    })

    return {
      name: 'list_nodes',
      output: JSON.stringify({
        count: nodeInfos.length,
        nodes: nodeInfos
      })
    }
  }

  private executeGetUpstream(args: Record<string, unknown>, nodes: Node[], edges: Edge[]): ToolResult {
    const nodeId = args.nodeId as string
    const maxDepth = (args.maxDepth as number) || 2

    if (!nodeId) {
      return { name: 'get_upstream', output: '', error: 'nodeId is required' }
    }

    const upstreamNodes = this.getUpstreamNodes(nodeId, maxDepth, nodes, edges)

    return {
      name: 'get_upstream',
      output: JSON.stringify({
        nodeId,
        upstreamCount: upstreamNodes.length,
        upstream: upstreamNodes
      })
    }
  }

  private executeSkillTool(skillId: string, args: Record<string, unknown>): ToolResult {
    return {
      name: skillId,
      output: JSON.stringify({
        skillId,
        message: `Skill "${skillId}" selected. The AI will now generate content using this skill's instructions.`,
        input: args.input
      })
    }
  }

  // ========== Helper Methods ==========

  /**
   * Get upstream nodes of a given node (without content)
   */
  private getUpstreamNodes(nodeId: string, maxDepth: number, nodes: Node[], edges: Edge[]): UpstreamNodeInfo[] {
    const visited = new Set<string>()
    const result: UpstreamNodeInfo[] = []
    const nodeMap = new Map(nodes.map(n => [n.id, n]))

    this.traverseUpstream(nodeId, 0, maxDepth, visited, result, nodeMap, edges)

    return result
  }

  private traverseUpstream(
    currentId: string,
    currentDepth: number,
    maxDepth: number,
    visited: Set<string>,
    result: UpstreamNodeInfo[],
    nodeMap: Map<string, Node>,
    edges: Edge[]
  ) {
    if (visited.has(currentId) || currentDepth > maxDepth) return
    visited.add(currentId)

    const upstreamEdges = edges.filter(e => e.target === currentId)

    for (const edge of upstreamEdges) {
      const sourceNode = nodeMap.get(edge.source)
      if (!sourceNode) continue

      const nodeData = sourceNode.data as unknown as NodeData
      result.push({
        nodeId: sourceNode.id,
        nodeLabel: nodeData.label,
        type: nodeData.type,
        distance: currentDepth + 1
      })

      this.traverseUpstream(sourceNode.id, currentDepth + 1, maxDepth, visited, result, nodeMap, edges)
    }
  }
}

// Singleton instance for backwards compatibility
export const toolRegistry = new ToolRegistry()
