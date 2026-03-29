import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface CanvasContextType {
  // 节点右键菜单
  contextMenu: { nodeId: string; nodeType: string; x: number; y: number } | null
  onNodeContextMenu: (nodeId: string, nodeType: string, x: number, y: number) => void
  clearContextMenu: () => void
  // 图片预览
  previewImage: string | null
  onPreviewImage: (imageUrl: string) => void
  // 视频预览
  previewVideo: string | null
  onPreviewVideo: (videoUrl: string) => void
  // 关闭所有菜单
  onCloseAllMenus: () => void
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined)

export function CanvasProvider({ children }: { children: ReactNode }) {
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string
    nodeType: string
    x: number
    y: number
  } | null>(null)

  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [previewVideo, setPreviewVideo] = useState<string | null>(null)

  const onNodeContextMenu = useCallback((nodeId: string, nodeType: string, x: number, y: number) => {
    setContextMenu({ nodeId, nodeType, x, y })
  }, [])

  const clearContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const onPreviewImage = useCallback((imageUrl: string) => {
    setPreviewImage(imageUrl)
  }, [])

  const onPreviewVideo = useCallback((videoUrl: string) => {
    setPreviewVideo(videoUrl)
  }, [])

  const onCloseAllMenus = useCallback(() => {
    setContextMenu(null)
    setPreviewImage(null)
    setPreviewVideo(null)
  }, [])

  return (
    <CanvasContext.Provider
      value={{
        contextMenu,
        onNodeContextMenu,
        clearContextMenu,
        previewImage,
        onPreviewImage,
        previewVideo,
        onPreviewVideo,
        onCloseAllMenus,
      }}
    >
      {children}
    </CanvasContext.Provider>
  )
}

export function useCanvasContext() {
  const context = useContext(CanvasContext)
  if (context === undefined) {
    throw new Error('useCanvasContext must be used within a CanvasProvider')
  }
  return context
}
