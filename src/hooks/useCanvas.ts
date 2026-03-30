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
import type { NodeData, NodeType } from '../types'
import { getNodeMediaUrl } from '../types'

// 创建节点数据的辅助函数
function createNodeData(type: NodeType, label?: string): NodeData {
  const defaultLabel = type === 'text' ? '文本节点' : type === 'block' ? '区块节点' : `${type}节点`
  const base: NodeData = { type, label: label || defaultLabel }

  switch (type) {
    case 'text':
      return { ...base, content: '' }
    case 'image':
      return { ...base, imageUrl: '' }
    case 'video':
      return { ...base, videoUrl: '' }
    case 'audio':
      return { ...base, audioUrl: '' }
    case 'block':
      return { ...base, contents: [] }
    default:
      return base
  }
}

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
    (type: string, position?: { x: number; y: number }) => {
      let finalPosition = position
      if (!finalPosition) {
        const viewport = getViewport()
        const centerX = (window.innerWidth / 2 - viewport.x) / viewport.zoom - NODE_WIDTH / 2
        const offset = NODE_HEIGHT + 30
        const lastNode = nodes[nodes.length - 1]
        const positionY = lastNode
          ? lastNode.position.y + offset
          : (window.innerHeight / 2 - viewport.y) / viewport.zoom - NODE_HEIGHT / 2
        finalPosition = { x: centerX, y: positionY }
      }

      const nodeType = type as NodeType
      const newNode: Node = {
        id: `${Date.now()}`,
        type: nodeType,
        position: finalPosition,
        data: createNodeData(nodeType) as unknown as Record<string, unknown>,
        style: { width: NODE_WIDTH, height: NODE_HEIGHT },
      }
      setNodes((nds) => [...nds, newNode])
      return newNode.id
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
          const url = getNodeMediaUrl(node.data as unknown as NodeData)
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

  // Add node at specific position and optionally connect from source
  const addNodeWithConnection = useCallback(
    (type: string, position: { x: number; y: number }, sourceNodeId?: string, sourceHandleId?: string) => {
      const nodeType = type as NodeType
      const newNode: Node = {
        id: `${Date.now()}`,
        type: nodeType,
        position,
        data: createNodeData(nodeType) as unknown as Record<string, unknown>,
        style: { width: NODE_WIDTH, height: NODE_HEIGHT },
      }
      setNodes((nds) => [...nds, newNode])

      // Create edge connection if source is provided
      if (sourceNodeId) {
        const connection: Connection = {
          source: sourceNodeId,
          target: newNode.id,
          targetHandle: null,
          sourceHandle: sourceHandleId ?? null,
        }
        setEdges((eds) => addEdge({ ...connection, type: 'bezier' }, eds))
      }
    },
    [setNodes, setEdges]
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
    addNodeWithConnection,
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
