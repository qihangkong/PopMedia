import { useCallback, useState, memo, useRef, useEffect } from 'react'
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
  Handle,
  Position,
  EdgeProps,
  Edge,
  getBezierPath,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import HeaderBar from '../components/HeaderBar'
import Sidebar from '../components/Sidebar'
import ControlBar from '../components/ControlBar'
import { NodeTypeIcon } from '../icons'
import { NODE_TYPE_MAP } from '../nodeTypes'
import {
  NODE_WIDTH,
  NODE_HEIGHT,
  NODE_MIN_WIDTH,
  NODE_MIN_HEIGHT,
  HANDLE_SIZE,
  HANDLE_RADIUS,
  GRID_SIZE,
  GRID_SNAP,
  DEFAULT_ZOOM,
  MAX_ZOOM,
  FIT_VIEW_PADDING,
} from '../constants'
import { saveCanvasData, loadCanvasData, saveCanvasMeta, updateCanvasPreview, uploadFile, getFileUrl } from '../utils/tauriApi'

// Convert stored media path to displayable URL
async function mediaPathToUrl(path: string): Promise<string> {
  return await getFileUrl(path)
}

// 生成UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// 拖拽调整大小的手柄组件
const ResizeHandle = ({ nodeId, onResize }: { nodeId: string; onResize: (nodeId: string, width: number, height: number) => void }) => {
  const isDragging = useRef(false)
  const startPos = useRef({ x: 0, y: 0, width: 0, height: 0 })
  const nodeRef = useRef<HTMLDivElement | null>(null)

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)

    isDragging.current = true

    const node = document.querySelector(`[data-id="${nodeId}"]`) as HTMLDivElement
    if (node) {
      nodeRef.current = node
      startPos.current = {
        x: e.clientX,
        y: e.clientY,
        width: node.offsetWidth,
        height: node.offsetHeight,
      }
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !nodeRef.current) return

    const dx = e.clientX - startPos.current.x
    const dy = e.clientY - startPos.current.y

    const newWidth = Math.max(NODE_MIN_WIDTH, startPos.current.width + dx)
    const newHeight = Math.max(NODE_MIN_HEIGHT, startPos.current.height + dy)

    nodeRef.current.style.width = `${newWidth}px`
    nodeRef.current.style.height = `${newHeight}px`
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current || !nodeRef.current) return
    isDragging.current = false

    const newWidth = nodeRef.current.offsetWidth
    const newHeight = nodeRef.current.offsetHeight
    onResize(nodeId, newWidth, newHeight)

    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  return (
    <div
      className="resize-handle"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <svg width="10" height="10" viewBox="0 0 10 10">
        <path d="M9 1L1 9M9 5L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      </svg>
    </div>
  )
}

// 通用节点组件 — 所有类型共用，根据 type prop 渲染不同样式
function BaseNode({ data, selected, id }: { data: { label: string; type: string; content?: string; imageUrl?: string; videoUrl?: string; audioUrl?: string }; selected: boolean; id: string }) {
  const { setNodes } = useReactFlow()
  const type = data.type || 'text'
  const meta = NODE_TYPE_MAP[type]
  const [displayImageUrl, setDisplayImageUrl] = useState(data.imageUrl || '')
  const [displayVideoUrl, setDisplayVideoUrl] = useState(data.videoUrl || '')
  const [displayAudioUrl, setDisplayAudioUrl] = useState(data.audioUrl || '')

  // 当 imageUrl 变为文件路径时，自动转换为 data URL
  useEffect(() => {
    if (data.imageUrl?.startsWith('assets/')) {
      mediaPathToUrl(data.imageUrl).then(setDisplayImageUrl)
    } else {
      setDisplayImageUrl(data.imageUrl || '')
    }
  }, [data.imageUrl])

  // 当 videoUrl 变为文件路径时，自动转换为 data URL
  useEffect(() => {
    if (data.videoUrl?.startsWith('assets/')) {
      mediaPathToUrl(data.videoUrl).then(setDisplayVideoUrl)
    } else {
      setDisplayVideoUrl(data.videoUrl || '')
    }
  }, [data.videoUrl])

  // 当 audioUrl 变为文件路径时，自动转换为 data URL
  useEffect(() => {
    if (data.audioUrl?.startsWith('assets/')) {
      mediaPathToUrl(data.audioUrl).then(setDisplayAudioUrl)
    } else {
      setDisplayAudioUrl(data.audioUrl || '')
    }
  }, [data.audioUrl])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onResize = useCallback((nodeId: string, width: number, height: number) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, style: { ...node.style, width, height } }
        }
        return node
      })
    )
  }, [setNodes])

  const isTextNode = type === 'text'
  const isImageNode = type === 'image'
  const isVideoNode = type === 'video'
  const isAudioNode = type === 'audio'
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const imageFileInputRef = useRef<HTMLInputElement>(null)
  const videoFileInputRef = useRef<HTMLInputElement>(null)
  const audioFileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  // 在 window 级别拦截 pointerdown/mousedown，判断 target 是否在 textarea 内，阻止冒泡以防触发节点拖拽
  useEffect(() => {
    const stopInTextarea = (e: Event) => {
      if (!textareaRef.current) return
      if (textareaRef.current.contains(e.target as globalThis.Node | null)) {
        e.stopPropagation()
      }
    }
    window.addEventListener('pointerdown', stopInTextarea, { capture: true })
    window.addEventListener('mousedown', stopInTextarea, { capture: true })
    return () => {
      window.removeEventListener('pointerdown', stopInTextarea, { capture: true })
      window.removeEventListener('mousedown', stopInTextarea, { capture: true })
    }
  }, [])

  const updateContent = useCallback(
    (newContent: string) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return { ...node, data: { ...node.data, content: newContent } }
          }
          return node
        })
      )
    },
    [setNodes, id]
  )

  const updateImageUrl = useCallback(
    (newImageUrl: string) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return { ...node, data: { ...node.data, imageUrl: newImageUrl } }
          }
          return node
        })
      )
    },
    [setNodes, id]
  )

  const updateVideoUrl = useCallback(
    (newVideoUrl: string) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return { ...node, data: { ...node.data, videoUrl: newVideoUrl } }
          }
          return node
        })
      )
    },
    [setNodes, id]
  )

  const updateAudioUrl = useCallback(
    (newAudioUrl: string) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return { ...node, data: { ...node.data, audioUrl: newAudioUrl } }
          }
          return node
        })
      )
    },
    [setNodes, id]
  )

  // 处理图片上传
  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        setUploading(true)
        try {
          const arrayBuffer = await file.arrayBuffer()
          const bytes = new Uint8Array(arrayBuffer)
          const path = await uploadFile(file.name, bytes)
          console.log('[Canvas] handleImageUpload: uploaded to', path)
          // 保存文件路径，显示时会通过 mediaPathToUrl 转换
          updateImageUrl(path)
        } finally {
          setUploading(false)
        }
      }
      e.target.value = ''
    },
    [updateImageUrl]
  )

  // 处理视频上传
  const handleVideoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        setUploading(true)
        try {
          const arrayBuffer = await file.arrayBuffer()
          const bytes = new Uint8Array(arrayBuffer)
          const path = await uploadFile(file.name, bytes)
          // 保存文件路径，显示时会通过 mediaPathToUrl 转换
          updateVideoUrl(path)
        } finally {
          setUploading(false)
        }
      }
      e.target.value = ''
    },
    [updateVideoUrl]
  )

  // 处理音频上传
  const handleAudioUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        setUploading(true)
        try {
          const arrayBuffer = await file.arrayBuffer()
          const bytes = new Uint8Array(arrayBuffer)
          const path = await uploadFile(file.name, bytes)
          // 保存文件路径，显示时会通过 mediaPathToUrl 转换
          updateAudioUrl(path)
        } finally {
          setUploading(false)
        }
      }
      e.target.value = ''
    },
    [updateAudioUrl]
  )

  // 触发预览事件
  const dispatchPreviewEvent = (eventName: string, detail: Record<string, unknown>) => {
    const event = new CustomEvent(eventName, { detail, bubbles: true })
    window.dispatchEvent(event)
  }

  return (
    <>
      <div
        className={`custom-node ${type}-node${selected ? ' selected' : ''}`}
        data-id={id}
        style={{ width: '100%', height: '100%' }}
        onContextMenu={(e) => {
          e.preventDefault()
          const event = new CustomEvent('nodeContextMenu', {
            detail: { nodeId: id, nodeType: type, x: e.clientX, y: e.clientY },
            bubbles: true,
          })
          e.currentTarget.dispatchEvent(event)
        }}
      >
        <div className={`node-header ${type}-header`}>
          <NodeTypeIcon type={type} />
          <input
            className={`node-label-input ${type}-label-input`}
            defaultValue={data.label || meta?.label}
            onBlur={(e) => {
              const newLabel = e.target.value
              if (newLabel === data.label) return
              setNodes((nds) =>
                nds.map((node) => {
                  if (node.id === id) {
                    return { ...node, data: { ...node.data, label: newLabel } }
                  }
                  return node
                })
              )
            }}
          />
        </div>
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          className="node-handle"
          style={{
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            border: '2px solid #6366f1',
            background: '#2a2a2a',
          }}
        />
        <div className="node-body">
          {isTextNode ? (
            <textarea
              ref={textareaRef}
              className="text-node-content"
              defaultValue={data.content || ''}
              placeholder={meta?.placeholderText}
              onBlur={(e) => {
                updateContent(e.target.value)
              }}
            />
          ) : isImageNode ? (
            displayImageUrl ? (
              <div className="image-preview-wrapper">
                <img
                  src={displayImageUrl}
                  alt=""
                  className="node-image-preview"
                  draggable={false}
                />
                <button
                  className="image-preview-btn"
                  title="预览图片"
                  onClick={(e) => {
                    e.stopPropagation()
                    dispatchPreviewEvent('previewImage', { imageUrl: displayImageUrl })
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
            ) : uploading ? (
              <div className="placeholder-text image-placeholder">
                <div className="upload-spinner" />
                <span>上传中...</span>
              </div>
            ) : (
              <div
                className="placeholder-text image-placeholder"
                onClick={() => imageFileInputRef.current?.click()}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>点击上传图片</span>
              </div>
            )
          ) : isVideoNode ? (
            displayVideoUrl ? (
              <div className="video-preview-wrapper">
                <video
                  src={displayVideoUrl}
                  className="node-media-preview"
                  preload="metadata"
                  controls
                />
                <button
                  className="video-preview-btn"
                  title="全屏预览视频"
                  onClick={(e) => {
                    e.stopPropagation()
                    dispatchPreviewEvent('previewVideo', { videoUrl: displayVideoUrl })
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
            ) : uploading ? (
              <div className="placeholder-text media-placeholder">
                <div className="upload-spinner" />
                <span>上传中...</span>
              </div>
            ) : (
              <div
                className="placeholder-text media-placeholder"
                onClick={() => videoFileInputRef.current?.click()}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                <span>点击上传视频</span>
              </div>
            )
          ) : isAudioNode ? (
            displayAudioUrl ? (
              <div className="audio-preview-wrapper">
                <audio
                  src={displayAudioUrl}
                  controls
                  className="node-media-preview"
                  preload="metadata"
                />
              </div>
            ) : uploading ? (
              <div className="placeholder-text media-placeholder">
                <div className="upload-spinner" />
                <span>上传中...</span>
              </div>
            ) : (
              <div
                className="placeholder-text media-placeholder"
                onClick={() => audioFileInputRef.current?.click()}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
                <span>点击上传音频</span>
              </div>
            )
          ) : (
            <div className="placeholder-text">{meta?.placeholderText}</div>
          )}
        </div>
        {/* 右上角图标按钮 */}
        <div className="node-actions">
          {isImageNode && (
            <button
              className="node-action-btn"
              title="上传图片"
              onClick={(e) => {
                e.stopPropagation()
                imageFileInputRef.current?.click()
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
            </button>
          )}
          {isImageNode && data.imageUrl && (
            <button
              className="node-action-btn delete-btn"
              title="删除图片"
              onClick={(e) => {
                e.stopPropagation()
                updateImageUrl('')
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
          {isVideoNode && (
            <button
              className="node-action-btn"
              title="上传视频"
              onClick={(e) => {
                e.stopPropagation()
                videoFileInputRef.current?.click()
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
            </button>
          )}
          {isVideoNode && data.videoUrl && (
            <button
              className="node-action-btn delete-btn"
              title="删除视频"
              onClick={(e) => {
                e.stopPropagation()
                if (data.videoUrl) URL.revokeObjectURL(data.videoUrl)
                updateVideoUrl('')
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
          {isAudioNode && (
            <button
              className="node-action-btn"
              title="上传音频"
              onClick={(e) => {
                e.stopPropagation()
                audioFileInputRef.current?.click()
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
            </button>
          )}
          {isAudioNode && data.audioUrl && (
            <button
              className="node-action-btn delete-btn"
              title="删除音频"
              onClick={(e) => {
                e.stopPropagation()
                if (data.audioUrl) URL.revokeObjectURL(data.audioUrl)
                updateAudioUrl('')
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {/* 隐藏的文件输入 */}
        {isImageNode && (
          <input
            ref={imageFileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageUpload}
          />
        )}
        {isVideoNode && (
          <input
            ref={videoFileInputRef}
            type="file"
            accept="video/*"
            style={{ display: 'none' }}
            onChange={handleVideoUpload}
          />
        )}
        {isAudioNode && (
          <input
            ref={audioFileInputRef}
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            onChange={handleAudioUpload}
          />
        )}
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          className="node-handle"
          style={{
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            border: '2px solid #6366f1',
            background: '#2a2a2a',
          }}
        />
        <ResizeHandle nodeId={id} onResize={onResize} />
      </div>
    </>
  )
}

// 节点类型映射
export const nodeTypes = {
  text: memo(BaseNode),
  image: memo(BaseNode),
  video: memo(BaseNode),
  audio: memo(BaseNode),
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

  const { zoomIn, zoomOut, getViewport, setViewport } = useReactFlow()

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
      const newNode: Node = {
        id: `${Date.now()}`,
        type: type,
        position: {
          x: Math.random() * 300 + 100,
          y: Math.random() * 200 + 100,
        },
        data: { label: type === 'text' ? '文本节点' : `${type}节点`, type, ...mediaData },
        style: { width: NODE_WIDTH, height: NODE_HEIGHT },
      }
      setNodes((nds) => [...nds, newNode])
    },
    [setNodes]
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
      }
      console.log('[Canvas] Loaded:', id)
    } catch (err) {
      console.log('[Canvas] No existing data or load failed, starting fresh')
    }
  }, [setNodes, setEdges, setViewport])

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

  // 监听画布名称变化时保存
  useEffect(() => {
    if (!isInitializedRef.current || isLoading) return
    saveCanvas()
  }, [canvasName])

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
        fitView
        fitViewOptions={{ maxZoom: MAX_ZOOM, padding: FIT_VIEW_PADDING }}
        snapToGrid={snapToGrid}
        snapGrid={GRID_SNAP}
        deleteKeyCode="Delete"
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'bezier' }}
        style={{ background: '#1a1a1a', position: 'relative' }}
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
    </div>
  )
}
