import { useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'

export function useNodeUpdates(nodeId: string) {
  const { setNodes } = useReactFlow()

  const updateContent = useCallback(
    (newContent: string) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return { ...node, data: { ...node.data, content: newContent } }
          }
          return node
        })
      )
    },
    [setNodes, nodeId]
  )

  const updateImageUrl = useCallback(
    (newImageUrl: string) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return { ...node, data: { ...node.data, imageUrl: newImageUrl } }
          }
          return node
        })
      )
    },
    [setNodes, nodeId]
  )

  const updateVideoUrl = useCallback(
    (newVideoUrl: string) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return { ...node, data: { ...node.data, videoUrl: newVideoUrl } }
          }
          return node
        })
      )
    },
    [setNodes, nodeId]
  )

  const updateAudioUrl = useCallback(
    (newAudioUrl: string) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return { ...node, data: { ...node.data, audioUrl: newAudioUrl } }
          }
          return node
        })
      )
    },
    [setNodes, nodeId]
  )

  const updateContents = useCallback(
    (newContents: Array<{ id: string; content: string }>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return { ...node, data: { ...node.data, contents: newContents } }
          }
          return node
        })
      )
    },
    [setNodes, nodeId]
  )

  const onResize = useCallback(
    (resizeNodeId: string, width: number, height: number) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === resizeNodeId) {
            return { ...node, style: { ...node.style, width, height } }
          }
          return node
        })
      )
    },
    [setNodes]
  )

  return { updateContent, updateImageUrl, updateVideoUrl, updateAudioUrl, updateContents, onResize }
}