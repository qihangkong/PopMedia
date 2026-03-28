import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Node, Edge, Viewport, Connection } from '@xyflow/react'
import { useNodesState, useEdgesState, useReactFlow } from '@xyflow/react'
import { addEdge } from '@xyflow/react'

import {
  NODE_WIDTH,
  NODE_HEIGHT,
  MAX_ZOOM,
  FIT_VIEW_PADDING,
} from '../constants'
import {
  saveCanvasData,
  loadCanvasData,
  saveCanvasMeta,
  updateCanvasPreview,
  getCanvasById,
} from '../utils/tauriApi'

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Canvas ID management hook
export function useCanvasId(loadCanvasFn: (id: string) => Promise<void>) {
  const [searchParams] = useSearchParams()
  const [canvasId, setCanvasId] = useState<string>('')
  const [canvasName, setCanvasName] = useState('未命名的画布')
  const [isLoading, setIsLoading] = useState(true)
  const isInitializedRef = useRef(false)

  useEffect(() => {
    const initCanvas = async () => {
      const idFromUrl = searchParams.get('id')
      if (idFromUrl) {
        setCanvasId(idFromUrl)
        try {
          const meta = await getCanvasById(idFromUrl)
          setCanvasName(meta.name)
        } catch {
          console.log('[Canvas] No meta found for:', idFromUrl)
        }
        await loadCanvasFn(idFromUrl)
        isInitializedRef.current = true
        setIsLoading(false)
      } else {
        const newId = generateUUID()
        setCanvasId(newId)
        isInitializedRef.current = true
        setIsLoading(false)
        const newUrl = `${window.location.pathname}?id=${newId}`
        window.history.replaceState({}, '', newUrl)
      }
    }
    initCanvas()
  }, [searchParams, loadCanvasFn])

  return {
    canvasId,
    setCanvasId,
    canvasName,
    setCanvasName,
    isLoading,
    isInitializedRef,
  }
}

// Canvas data (nodes/edges) management hook
export function useCanvasData() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const { getViewport, setViewport, fitView } = useReactFlow()

  const onConnect = useCallback(
    (connection: Connection) => {
      const exists = edges.some(
        (e) => e.source === connection.source && e.target === connection.target
      )
      if (exists) return
      setEdges((eds) => addEdge({ ...connection, type: 'bezier' }, eds))
    },
    [setEdges, edges]
  )

  const isValidConnection = useCallback((connection: Edge | Connection) => {
    return connection.source !== connection.target
  }, [])

  const addNode = useCallback(
    (type: string) => {
      const mediaData: Record<string, unknown> = {}
      if (type === 'text') mediaData.content = ''
      if (type === 'image') mediaData.imageUrl = ''
      if (type === 'video') mediaData.videoUrl = ''
      if (type === 'audio') mediaData.audioUrl = ''
      const viewport = getViewport()
      const centerX = (window.innerWidth / 2 - viewport.x) / viewport.zoom - NODE_WIDTH / 2
      const offset = NODE_HEIGHT + 30
      const lastNode = nodes[nodes.length - 1]
      const positionY = lastNode
        ? lastNode.position.y + offset
        : (window.innerHeight / 2 - viewport.y) / viewport.zoom - NODE_HEIGHT / 2

      const newNode: Node = {
        id: `${Date.now()}`,
        type,
        position: { x: centerX, y: positionY },
        data: { label: type === 'text' ? '文本节点' : `${type}节点`, type, ...mediaData },
        style: { width: NODE_WIDTH, height: NODE_HEIGHT },
      }
      setNodes((nds) => [...nds, newNode])
    },
    [setNodes, getViewport, nodes]
  )

  const loadCanvas = useCallback(
    async (id: string) => {
      try {
        const data = await loadCanvasData(id)
        if (data.nodes && Array.isArray(data.nodes)) {
          setNodes(data.nodes as Node[])
        }
        if (data.edges && Array.isArray(data.edges)) {
          setEdges(data.edges as Edge[])
        }
        if (data.viewport) {
          setViewport(data.viewport as Viewport)
        } else {
          setTimeout(() => fitView({ maxZoom: MAX_ZOOM, padding: FIT_VIEW_PADDING }), 0)
        }
        console.log('[Canvas] Loaded:', id)
      } catch {
        console.log('[Canvas] No existing data or load failed, starting fresh')
      }
    },
    [setNodes, setEdges, setViewport, fitView]
  )

  const saveCanvas = useCallback(
    async (canvasId: string, canvasName: string, nodes: Node[], edges: Edge[]) => {
      if (!canvasId) return
      try {
        const viewport = getViewport()
        await saveCanvasData(canvasId, { nodes, edges, viewport })

        const mediaUrls: string[] = []
        const seenUrls = new Set<string>()
        for (const node of nodes) {
          const url =
            (node.data as { imageUrl?: string }).imageUrl ||
            (node.data as { videoUrl?: string }).videoUrl ||
            (node.data as { audioUrl?: string }).audioUrl
          if (url && !seenUrls.has(url)) {
            seenUrls.add(url)
            mediaUrls.push(url)
          }
        }

        const preview = JSON.stringify(mediaUrls.slice(0, 1))
        await updateCanvasPreview(canvasId, preview)
        await saveCanvasMeta({
          id: canvasId,
          name: canvasName,
          thumbnail: null,
          project_id: null,
          preview,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        console.log('[Canvas] Saved:', canvasId)
      } catch (err) {
        console.error('[Canvas] Save failed:', err)
      }
    },
    [getViewport]
  )

  return {
    nodes,
    setNodes,
    onNodesChange,
    edges,
    setEdges,
    onEdgesChange,
    onConnect,
    isValidConnection,
    addNode,
    loadCanvas,
    saveCanvas,
  }
}

// Auto-save hook
export function useCanvasAutoSave(
  canvasId: string,
  canvasName: string,
  nodes: Node[],
  edges: Edge[],
  isInitializedRef: React.MutableRefObject<boolean>,
  isLoading: boolean,
  saveCanvasFn: (canvasId: string, canvasName: string, nodes: Node[], edges: Edge[]) => Promise<void>
) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isInitializedRef.current || isLoading) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveCanvasFn(canvasId, canvasName, nodes, edges)
    }, 1000)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [nodes, edges, canvasName, canvasId, saveCanvasFn, isLoading, isInitializedRef])
}

// Event listeners hook
export function useCanvasEventListeners() {
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string
    nodeType: string
    x: number
    y: number
  } | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [previewVideo, setPreviewVideo] = useState<string | null>(null)

  useEffect(() => {
    const handleNodeContextMenu = (e: Event) => {
      const customEvent = e as CustomEvent<{ nodeId: string; nodeType: string; x: number; y: number }>
      setContextMenu(customEvent.detail)
    }
    window.addEventListener('nodeContextMenu', handleNodeContextMenu)
    return () => window.removeEventListener('nodeContextMenu', handleNodeContextMenu)
  }, [])

  useEffect(() => {
    const handlePreviewImage = (e: Event) => {
      const customEvent = e as CustomEvent<{ imageUrl: string }>
      setPreviewImage(customEvent.detail.imageUrl)
    }
    window.addEventListener('previewImage', handlePreviewImage)
    return () => window.removeEventListener('previewImage', handlePreviewImage)
  }, [])

  useEffect(() => {
    const handlePreviewVideo = (e: Event) => {
      const customEvent = e as CustomEvent<{ videoUrl: string }>
      setPreviewVideo(customEvent.detail.videoUrl)
    }
    window.addEventListener('previewVideo', handlePreviewVideo)
    return () => window.removeEventListener('previewVideo', handlePreviewVideo)
  }, [])

  const handleUploadMedia = useCallback((nodeId: string) => {
    const nodeEl = document.querySelector(`[data-id="${nodeId}"]`) as HTMLElement
    const fileInput = nodeEl?.querySelector('input[type="file"]') as HTMLInputElement
    fileInput?.click()
  }, [])

  return {
    contextMenu,
    setContextMenu,
    previewImage,
    setPreviewImage,
    previewVideo,
    setPreviewVideo,
    handleUploadMedia,
  }
}
