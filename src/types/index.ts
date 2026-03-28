export type NodeType = 'text' | 'image' | 'video' | 'audio'

export interface BaseNodeData {
  label: string
  type: NodeType
  content?: string
  imageUrl?: string
  videoUrl?: string
  audioUrl?: string
}
