import { Node, Edge } from '@xyflow/react'

export type NodeType = 'text' | 'image' | 'video' | 'audio'

export interface BaseNodeData {
  label: string
  type: NodeType
  content?: string
  imageUrl?: string
  videoUrl?: string
  audioUrl?: string
}

export interface AppState {
  canvasName: string
  setCanvasName: (name: string) => void
}

export interface FlowState {
  nodes: Node<Node>[]
  setNodes: React.Dispatch<React.SetStateAction<Node<Node>[]>>
  edges: Edge[]
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
  previewImage: string | null
  setPreviewImage: (url: string | null) => void
  previewVideo: string | null
  setPreviewVideo: (url: string | null) => void
}
