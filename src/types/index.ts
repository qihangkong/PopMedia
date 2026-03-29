export type NodeType = 'text' | 'image' | 'video' | 'audio' | 'script'

// AI types (imported directly to ensure availability in this file)
import type { NodeAIConfig, NodeRole } from './ai'
export { NodeRole }
export type { NodeAIConfig }

// 节点数据 - 统一类型定义
export interface NodeData {
  label: string
  type: NodeType
  // 文本内容
  content?: string
  // 媒体 URL
  imageUrl?: string
  videoUrl?: string
  audioUrl?: string
  // AI 配置
  aiConfig?: NodeAIConfig
  systemPrompt?: string
}

// 获取节点内容的辅助函数
export function getNodeContent(data: NodeData): string {
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

// 获取节点媒体 URL
export function getNodeMediaUrl(data: NodeData): string | undefined {
  return data.imageUrl || data.videoUrl || data.audioUrl
}

// Re-export remaining AI types
export type { ExecutionState, ChatMessage, CachedContext } from './ai'
