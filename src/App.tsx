import { useCallback, useState, memo, useRef, useEffect } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
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

import { NodeTypeIcon } from './icons'
import { NODE_TYPE_MAP } from './nodeTypes'
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
} from './constants'
import Sidebar from './components/Sidebar'
import ControlBar from './components/ControlBar'

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
function BaseNode({ data, selected, id }: { data: { label: string; type: string; content?: string; imageUrl?: string }; selected: boolean; id: string }) {
  const { setNodes } = useReactFlow()
  const type = data.type || 'text'
  const meta = NODE_TYPE_MAP[type]

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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // 处理图片上传
  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const result = event.target?.result as string
          updateImageUrl(result)
        }
        reader.readAsDataURL(file)
      }
      // 清空 input，允许重复选择同一文件
      e.target.value = ''
    },
    [updateImageUrl]
  )

  return (
    <>
      <div
        className={`custom-node ${type}-node${selected ? ' selected' : ''}`}
        data-id={id}
        style={{ width: '100%', height: '100%' }}
        onContextMenu={(e) => {
          e.preventDefault()
          // 通过自定义事件传递上下文菜单请求
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
            data.imageUrl ? (
              <div className="image-preview-wrapper">
                <img
                  src={data.imageUrl}
                  alt=""
                  className="node-image-preview"
                  draggable={false}
                />
                <button
                  className="image-preview-btn"
                  title="预览图片"
                  onClick={(e) => {
                    e.stopPropagation()
                    const event = new CustomEvent('previewImage', {
                      detail: { imageUrl: data.imageUrl },
                      bubbles: true,
                    })
                    e.currentTarget.dispatchEvent(event)
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
            ) : (
              <div
                className="placeholder-text image-placeholder"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>点击上传图片</span>
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
                fileInputRef.current?.click()
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
        </div>
        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageUpload}
        />
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

// 节点类型映射 — 所有类型共用 BaseNode，通过 data.type 区分
export const nodeTypes = {
  text: memo(BaseNode),
  image: memo(BaseNode),
  video: memo(BaseNode),
  audio: memo(BaseNode),
}

// 手柄半径，用于将连线端点从手柄中心收缩到节点边框

// 自定义贝塞尔边：连线端点贴合节点边框，悬停不变色，点击才选中变色
function CustomBezierEdge({
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
  // 根据手柄位置计算偏移量，向节点内部收缩
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
      {/* 透明的可点击区域（用于增大点击范围） */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: 'pointer' }}
      />
      {/* 可见的边 */}
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

function FlowWithControls() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [showMinimap, setShowMinimap] = useState(true)
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [canvasName, setCanvasName] = useState('未命名的画布')
  // 上下文菜单状态
  const [contextMenu, setContextMenu] = useState<{ nodeId: string; nodeType: string; x: number; y: number } | null>(null)
  // 图片预览弹窗
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const { zoomIn, zoomOut, getViewport, setViewport } = useReactFlow()

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      // 检查是否重复连线
      const exists = edges.some(
        (e) => e.source === connection.source && e.target === connection.target
      )
      if (exists) {
        return // 不添加重复的边
      }
      setEdges((eds) => addEdge({ ...connection, type: 'bezier' }, eds))
    },
    [setEdges, edges]
  )

  // 连线规则：只能从源节点的右侧连接到目标节点的左侧，不能自己连自己
  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      const source = connection.source
      const target = connection.target

      // 不能自己连自己
      if (source === target) {
        return false
      }

      return true
    },
    []
  )

  const addNode = useCallback(
    (type: string) => {
      const newNode: Node = {
        id: `${Date.now()}`,
        type: type,
        position: {
          x: Math.random() * 300 + 100,
          y: Math.random() * 200 + 100,
        },
        data: { label: type === 'text' ? '文本节点' : `${type}节点`, type, ...(type === 'text' ? { content: '' } : {}) },
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

  // 处理图片上传
  const handleUploadImage = useCallback(
    (nodeId: string) => {
      // 触发对应节点的文件 input
      const nodeEl = document.querySelector(`[data-id="${nodeId}"]`) as HTMLElement
      const fileInput = nodeEl?.querySelector('input[type="file"]') as HTMLInputElement
      fileInput?.click()
    },
    []
  )

  return (
    <>
      <Sidebar onAddNode={addNode} />

      {/* Header navigation bar */}
      <div className="canvas-header-bar">
        <div className="canvas-header-inner">
          <img className="canvas-header-icon" src="/PopMedia.png" alt="PopMedia" />
          <span className="canvas-header-brand">PopMedia</span>
          <span className="canvas-header-sep">|</span>
          <span
            className="canvas-header-canvas-name"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => setCanvasName(e.currentTarget.textContent || '')}
            onClick={(e) => e.stopPropagation()}
          >
            {canvasName}
          </span>
        </div>
      </div>

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

      {/* 图片节点上下文菜单 */}
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
          <button
            className="context-menu-item"
            onClick={() => {
              handleUploadImage(contextMenu.nodeId)
              setContextMenu(null)
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            上传图片
          </button>
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
    </>
  )
}

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <ReactFlowProvider>
        <FlowWithControls />
      </ReactFlowProvider>
    </div>
  )
}
