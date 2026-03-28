import { useCallback, useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Connection,
  OnConnect,
  Node,
  Viewport,
  Position,
  EdgeProps,
  Edge,
  getBezierPath,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import HeaderBar from '../components/HeaderBar'
import Sidebar from '../components/Sidebar'
import ControlBar from '../components/ControlBar'
import ChatDrawer from '../components/ChatDrawer'
import { TextNode } from '../components/TextNode'
import { ImageNode } from '../components/ImageNode'
import { VideoNode } from '../components/VideoNode'
import { AudioNode } from '../components/AudioNode'
import {
  NODE_WIDTH,
  NODE_HEIGHT,
  HANDLE_RADIUS,
  GRID_SIZE,
  GRID_SNAP,
  DEFAULT_ZOOM,
  MAX_ZOOM,
  FIT_VIEW_PADDING,
} from '../constants'
import { saveCanvasData, loadCanvasData, saveCanvasMeta, updateCanvasPreview, getCanvasById } from '../utils/tauriApi'

// 生成UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// 节点类型映射
export const nodeTypes = {
  text: TextNode,
  image: ImageNode,
  video: VideoNode,
  audio: AudioNode,
}

// 自定义贝塞尔边
function CustomBezierEdge ({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  selected,
  style,
}: EdgeProps) {
  const getOffset = (pos: Position) => {
    const offset = HANDLE_RADIUS * 2
    switch (pos) {
      case Position.Left:
        return { x: offset, y: 0 }
      case Position.Right:
        return { x: -offset, y: 0 }
      case Position.Top:
        return { x: 0, y: -offset }
      case Position.Bottom:
        return { x: 0, y: offset }
      default:
        return { x: 0, y: 0 }
    }
  }

  const sourceOff = getOffset(sourcePosition)
  const targetOff = getOffset(targetPosition)

  const [edgePath] = getBezierPath({
    sourceX: sourceX + sourceOff.x,
    sourceY: sourceY + sourceOff.y,
    sourcePosition,
    targetX: targetX + targetOff.x,
    targetY: targetY + targetOff.y,
    targetPosition,
  })

  return (
    <>
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: 'pointer' }}
      />
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={selected ? '#3b82f6' : '#ffffff'}
        strokeWidth={2}
        style={{
          transition: 'stroke 0.2s',
          ...style,
        }}
      />
    </>
  )
}

const edgeTypes = {
  bezier: CustomBezierEdge,
}

export default function Canvas() {
  const [searchParams] = useSearchParams()
  const [canvasId, setCanvasId] = useState<string>('')
  const [canvasName, setCanvasName] = useState('未命名的画布')
  const [contextMenu, setContextMenu] = useState<{ nodeId: string; nodeType: string; x: number; y: number } | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [previewVideo, setPreviewVideo] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showMinimap, setShowMinimap] = useState(true)
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const { zoomIn, zoomOut, getViewport, setViewport, fitView } = useReactFlow()

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitializedRef = useRef(false)

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const exists = edges.some(
        (e) => e.source === connection.source && e.target === connection.target
      )
      if (exists) {
        return
      }
      setEdges((eds) => addEdge({ ...connection, type: 'bezier' }, eds))
    },
    [setEdges, edges]
  )

  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      const source = connection.source
      const target = connection.target
      if (source === target) {
        return false
      }
      return true
    },
    []
  )

  const addNode = useCallback(
    (type: string) => {
      const mediaData: Record<string, unknown> = {}
      if (type === 'text') mediaData.content = ''
      if (type === 'image') mediaData.imageUrl = ''
      if (type === 'video') mediaData.videoUrl = ''
      if (type === 'audio') mediaData.audioUrl = ''
      const viewport = getViewport()
      // 计算屏幕中央在流程坐标中的位置，节点中心对齐屏幕中央
      const centerX = (window.innerWidth / 2 - viewport.x) / viewport.zoom - NODE_WIDTH / 2
      // 如果已有节点，新节点创建在最后一个节点下方；否则创建在屏幕中央
      const offset = NODE_HEIGHT + 30
      const lastNode = nodes[nodes.length - 1]
      const positionY = lastNode ? lastNode.position.y + offset : (window.innerHeight / 2 - viewport.y) / viewport.zoom - NODE_HEIGHT / 2

      const newNode: Node = {
        id: `${Date.now()}`,
        type: type,
        position: {
          x: centerX,
          y: positionY,
        },
        data: { label: type === 'text' ? '文本节点' : `${type}节点`, type, ...mediaData },
        style: { width: NODE_WIDTH, height: NODE_HEIGHT },
      }
      setNodes((nds) => [...nds, newNode])
    },
    [setNodes, getViewport, nodes]
  )

  const handleMoveEnd = useCallback((_: MouseEvent | TouchEvent | null, viewport: Viewport) => {
    setZoom(viewport.zoom)
  }, [])

  const setZoomLevel = useCallback((value: number) => {
    const currentViewport = getViewport()
    setViewport({ ...currentViewport, zoom: value })
    setZoom(value)
  }, [getViewport, setViewport])

  // 监听节点上下文菜单事件
  useEffect(() => {
    const handleNodeContextMenu = (e: Event) => {
      const customEvent = e as CustomEvent<{ nodeId: string; nodeType: string; x: number; y: number }>
      setContextMenu(customEvent.detail)
    }
    window.addEventListener('nodeContextMenu', handleNodeContextMenu)
    return () => window.removeEventListener('nodeContextMenu', handleNodeContextMenu)
  }, [])

  // 监听图片预览事件
  useEffect(() => {
    const handlePreviewImage = (e: Event) => {
      const customEvent = e as CustomEvent<{ imageUrl: string }>
      setPreviewImage(customEvent.detail.imageUrl)
    }
    window.addEventListener('previewImage', handlePreviewImage)
    return () => window.removeEventListener('previewImage', handlePreviewImage)
  }, [])

  // 监听视频预览事件
  useEffect(() => {
    const handlePreviewVideo = (e: Event) => {
      const customEvent = e as CustomEvent<{ videoUrl: string }>
      setPreviewVideo(customEvent.detail.videoUrl)
    }
    window.addEventListener('previewVideo', handlePreviewVideo)
    return () => window.removeEventListener('previewVideo', handlePreviewVideo)
  }, [])

  // 处理媒体上传
  const handleUploadMedia = useCallback(
    (nodeId: string) => {
      const nodeEl = document.querySelector(`[data-id="${nodeId}"]`) as HTMLElement
      const fileInput = nodeEl?.querySelector('input[type="file"]') as HTMLInputElement
      fileInput?.click()
    },
    []
  )

  // 保存画布数据
  const saveCanvas = useCallback(async () => {
    if (!canvasId || !isInitializedRef.current) return
    try {
      const viewport = getViewport()
      await saveCanvasData(canvasId, {
        nodes,
        edges,
        viewport,
      })
      // 提取所有媒体URL用于预览
      const mediaUrls: string[] = []
      const seenUrls = new Set<string>()
      for (const node of nodes) {
        const url = (node.data as { imageUrl?: string; videoUrl?: string; audioUrl?: string }).imageUrl
          || (node.data as { imageUrl?: string; videoUrl?: string; audioUrl?: string }).videoUrl
          || (node.data as { imageUrl?: string; videoUrl?: string; audioUrl?: string }).audioUrl
        if (url && !seenUrls.has(url)) {
          seenUrls.add(url)
          mediaUrls.push(url)
        }
      }
      console.log('[Canvas] saveCanvas: extracted URLs:', mediaUrls)
      // 只保留第一个媒体作为预览
      const preview = JSON.stringify(mediaUrls.slice(0, 1))
      // 更新预览
      await updateCanvasPreview(canvasId, preview)
      // 更新元数据
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
  }, [canvasId, canvasName, nodes, edges, getViewport])

  // 加载画布数据
  const loadCanvas = useCallback(async (id: string) => {
    // Load canvas meta (name) first
    try {
      const meta = await getCanvasById(id)
      setCanvasName(meta.name)
    } catch (err) {
      console.log('[Canvas] No meta found for:', id)
    }

    // Load canvas data (nodes, edges, viewport)
    try {
      const data = await loadCanvasData(id)

      // Nodes already have media URLs (file paths or data URLs from database)
      // BaseNode's useEffect will handle conversion for display
      if (data.nodes && Array.isArray(data.nodes)) {
        setNodes(data.nodes as Node[])
      }
      if (data.edges && Array.isArray(data.edges)) {
        setEdges(data.edges as Edge[])
      }
      if (data.viewport) {
        setViewport(data.viewport as Viewport)
      } else {
        // 没有保存视口时，适用 fitView 来显示所有节点
        setTimeout(() => fitView({ maxZoom: MAX_ZOOM, padding: FIT_VIEW_PADDING }), 0)
      }
      console.log('[Canvas] Loaded:', id)
    } catch (err) {
      console.log('[Canvas] No existing data or load failed, starting fresh')
    }
  }, [setNodes, setEdges, setViewport, setCanvasName, fitView])

  // 初始化画布ID
  useEffect(() => {
    const initCanvas = async () => {
      const idFromUrl = searchParams.get('id')
      if (idFromUrl) {
        setCanvasId(idFromUrl)
        await loadCanvas(idFromUrl)
        isInitializedRef.current = true
        setIsLoading(false)
      } else {
        const newId = generateUUID()
        setCanvasId(newId)
        isInitializedRef.current = true
        setIsLoading(false)
        // 更新URL
        const newUrl = `${window.location.pathname}?id=${newId}`
        window.history.replaceState({}, '', newUrl)
      }
    }
    initCanvas()
  }, [searchParams])

  // 自动保存（防抖）
  useEffect(() => {
    if (!isInitializedRef.current || isLoading) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveCanvas()
    }, 1000)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [nodes, edges, canvasName, saveCanvas, isLoading])

  return (
    <div className="page-container">
      {isLoading && (
        <div className="canvas-loading">
          <span>加载中...</span>
        </div>
      )}
      <HeaderBar
        canvasName={canvasName}
        onCanvasNameChange={setCanvasName}
      />
      <Sidebar onAddNode={addNode} />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onMoveEnd={handleMoveEnd}
        onDoubleClick={(e) => {
          e.stopPropagation()
        }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        isValidConnection={isValidConnection}
        fitViewOptions={{ maxZoom: MAX_ZOOM, padding: FIT_VIEW_PADDING }}
        snapToGrid={snapToGrid}
        snapGrid={GRID_SNAP}
        deleteKeyCode="Delete"
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'bezier' }}
        style={{ background: '#1a1a1a', position: 'relative' }}
        onPaneClick={() => {
          // 点击画布空白处时，广播关闭菜单事件
          window.dispatchEvent(new CustomEvent('closeAllMenus'))
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={GRID_SIZE}
          color="rgba(255, 255, 255, 0.15)"
        />
        {showMinimap && (
          <MiniMap
            nodeColor="rgba(100, 100, 100, 0.5)"
            maskColor="rgba(0, 0, 0, 0.6)"
            pannable
            zoomable
            className="custom-minimap"
            style={{
              borderRadius: 12,
              position: 'absolute',
              left: 16,
              bottom: 60,
              width: 200,
              height: 112,
            }}
          />
        )}
        <ControlBar
          zoom={zoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onToggleMinimap={() => setShowMinimap(!showMinimap)}
          onToggleSnapGrid={() => setSnapToGrid(!snapToGrid)}
          onSetZoom={setZoomLevel}
          showMinimap={showMinimap}
          snapToGrid={snapToGrid}
        />
      </ReactFlow>

      {/* 节点上下文菜单 */}
      {contextMenu && (
        <div
          className="node-context-menu"
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1000,
          }}
        >
          {(contextMenu.nodeType === 'image' || contextMenu.nodeType === 'video' || contextMenu.nodeType === 'audio') && (
            <button
              className="context-menu-item"
              onClick={() => {
                handleUploadMedia(contextMenu.nodeId)
                setContextMenu(null)
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              {contextMenu.nodeType === 'image' ? '上传图片' : contextMenu.nodeType === 'video' ? '上传视频' : '上传音频'}
            </button>
          )}
        </div>
      )}

      {/* 图片预览弹窗 */}
      {previewImage && (
        <div
          className="image-preview-modal"
          onClick={() => setPreviewImage(null)}
        >
          <button
            className="preview-modal-close"
            onClick={() => setPreviewImage(null)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <img
            src={previewImage}
            alt=""
            className="preview-modal-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* 视频预览弹窗 */}
      {previewVideo && (
        <div
          className="video-preview-modal"
          onClick={() => setPreviewVideo(null)}
        >
          <button
            className="preview-modal-close"
            onClick={() => setPreviewVideo(null)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <video
            src={previewVideo}
            className="video-modal-player"
            controls
            autoPlay
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* AI 聊天抽屉 */}
      <ChatDrawer />
    </div>
  )
}
