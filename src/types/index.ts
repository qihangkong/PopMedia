export type NodeType = 'text' | 'image' | 'video' | 'audio' | 'script' | 'block'

// AI types (imported directly to ensure availability in this file)
import type { NodeAIConfig, NodeRole } from './ai'
export { NodeRole }
export type { NodeAIConfig }

// Block content item
export interface BlockContent {
  id: string
  type: 'text' | 'image' | 'video' | 'audio'
  content?: string
  imageUrl?: string
  videoUrl?: string
  audioUrl?: string
}

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
  // 区块内容 (for block node)
  contents?: BlockContent[]
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

// Generate UUID v4
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Re-export settings/API types
export type {
  LlmConfig,
  ComfyuiConfig,
  ProjectInfo,
  SaveResult,
  ProjectInfoData,
  CanvasInfo,
  CanvasData,
  SkillInfo,
  SkillMeta,
  SkillReference,
} from './settings'
