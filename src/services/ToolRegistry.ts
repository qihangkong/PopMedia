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
 * Provides:
 * - Node tools: read_node, write_node, list_nodes, get_upstream
 * - Skill tools: converted from SkillRegistry
 */
class ToolRegistry {
  // Current canvas state (set by Canvas/AIExecutionEngine)
  private nodes: Node[] = []
  private edges: Edge[] = []

  /**
   * Update the current canvas state
   */
  setCanvasState(nodes: Node[], edges: Edge[]) {
    this.nodes = nodes
    this.edges = edges
  }

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
   * Find a node by ID
   */
  private findNode(nodeId: string): Node | undefined {
    return this.nodes.find(n => n.id === nodeId)
  }

  /**
   * Execute a tool call and return the result
   */
  async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    const { name, arguments: args } = toolCall

    try {
      switch (name) {
        case 'read_node':
          return this.executeReadNode(args)
        case 'write_node':
          return this.executeWriteNode(args)
        case 'list_nodes':
          return this.executeListNodes(args)
        case 'get_upstream':
          return this.executeGetUpstream(args)
        default:
          // Check if it's a skill tool
          if (skillRegistry.findById(name)) {
            return this.executeSkillTool(name, args)
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
   * Execute multiple tool calls
   */
  async executeToolCalls(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    const results: ToolResult[] = []
    for (const toolCall of toolCalls) {
      const result = await this.executeTool(toolCall)
      results.push(result)
    }
    return results
  }

  // ========== Tool Executors ==========

  private executeReadNode(args: Record<string, unknown>): ToolResult {
    const nodeId = args.nodeId as string
    if (!nodeId) {
      return { name: 'read_node', output: '', error: 'nodeId is required' }
    }

    const node = this.findNode(nodeId)
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

  private executeWriteNode(args: Record<string, unknown>): ToolResult {
    const nodeId = args.nodeId as string
    const content = args.content as string

    if (!nodeId) {
      return { name: 'write_node', output: '', error: 'nodeId is required' }
    }
    if (content === undefined) {
      return { name: 'write_node', output: '', error: 'content is required' }
    }

    const node = this.findNode(nodeId)
    if (!node) {
      return { name: 'write_node', output: '', error: `Node not found: ${nodeId}` }
    }

    const nodeData = node.data as unknown as NodeData

    // For text/script nodes, write to content
    // For block nodes, this is more complex but we focus on text nodes first
    if (nodeData.type === 'text' || nodeData.type === 'script' || nodeData.type === 'block') {
      // Content will be written via React Flow state update
      // The caller (AIExecutionEngine) needs to handle the actual state update
      // Here we just return success
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

  private executeListNodes(_args: Record<string, unknown>): ToolResult {
    const nodeInfos = this.nodes.map(n => {
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

  private executeGetUpstream(args: Record<string, unknown>): ToolResult {
    const nodeId = args.nodeId as string
    const maxDepth = (args.maxDepth as number) || 2

    if (!nodeId) {
      return { name: 'get_upstream', output: '', error: 'nodeId is required' }
    }

    const upstreamNodes = this.getUpstreamNodes(nodeId, maxDepth)

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
    // Skill tools are not executed by the frontend directly
    // They are returned to the AI which should include them in the next turn
    // The AI will then generate the actual skill content based on the skill's instructions
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
  private getUpstreamNodes(nodeId: string, maxDepth: number = 2): UpstreamNodeInfo[] {
    const visited = new Set<string>()
    const result: UpstreamNodeInfo[] = []
    const nodeMap = new Map(this.nodes.map(n => [n.id, n]))

    this.traverseUpstream(nodeId, 0, maxDepth, visited, result, nodeMap)

    return result
  }

  private traverseUpstream(
    currentId: string,
    currentDepth: number,
    maxDepth: number,
    visited: Set<string>,
    result: UpstreamNodeInfo[],
    nodeMap: Map<string, Node>
  ) {
    if (visited.has(currentId) || currentDepth > maxDepth) return
    visited.add(currentId)

    const upstreamEdges = this.edges.filter(e => e.target === currentId)

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

      this.traverseUpstream(sourceNode.id, currentDepth + 1, maxDepth, visited, result, nodeMap)
    }
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry()
