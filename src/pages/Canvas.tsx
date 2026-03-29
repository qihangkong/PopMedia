import { useCallback, useState, useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Viewport,
  Position,
  EdgeProps,
  getBezierPath,
  OnConnectStart,
  OnConnectEnd,
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
import { ImagePreviewModal, VideoPreviewModal } from '../components/CanvasModals'
import { AddNodeMenu } from '../components/AddNodeMenu'
import {
  GRID_SIZE,
  GRID_SNAP,
  DEFAULT_ZOOM,
  MAX_ZOOM,
  FIT_VIEW_PADDING,
  NODE_WIDTH,
  NODE_HEIGHT,
} from '../constants'
import {
  useCanvasId,
  useCanvasData,
  useCanvasAutoSave,
  useCanvasEventListeners,
} from '../hooks/useCanvas'

export const nodeTypes = {
  text: TextNode,
  image: ImageNode,
  video: VideoNode,
  audio: AudioNode,
}

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
  const getOffset = (pos: Position) => {
    const offset = 12
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
  const [showMinimap, setShowMinimap] = useState(true)
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)

  // Add node menu state for connection drag
  const [addNodeMenu, setAddNodeMenu] = useState<{
    x: number
    y: number
    sourceNodeId: string
    sourceHandleId: string
  } | null>(null)
  const pendingConnectionRef = useRef<{
    sourceNodeId: string
    sourceHandleId: string
  } | null>(null)

  const { zoomIn, zoomOut, getViewport, setViewport } = useReactFlow()
  const {
    nodes,
    onNodesChange,
    edges,
    onEdgesChange,
    onConnect,
    isValidConnection,
    addNode,
    addNodeWithConnection,
    loadCanvas,
    saveCanvas,
  } = useCanvasData()
  const { canvasId, canvasName, setCanvasName, isLoading, isInitializedRef } = useCanvasId(loadCanvas)
  const {
    previewImage,
    setPreviewImage,
    previewVideo,
    setPreviewVideo,
  } = useCanvasEventListeners()

  useCanvasAutoSave(canvasId, canvasName, nodes, edges, isInitializedRef, isLoading, saveCanvas)

  const handleMoveEnd = useCallback((_: MouseEvent | TouchEvent | null, viewport: Viewport) => {
    setZoom(viewport.zoom)
  }, [])

  const setZoomLevel = useCallback(
    (value: number) => {
      const currentViewport = getViewport()
      setViewport({ ...currentViewport, zoom: value })
      setZoom(value)
    },
    [getViewport, setViewport]
  )

  // Handle connection drag start
  const onConnectStart: OnConnectStart = useCallback((_, params) => {
    if (params.nodeId && params.handleId) {
      pendingConnectionRef.current = {
        sourceNodeId: params.nodeId,
        sourceHandleId: params.handleId,
      }
    }
  }, [])

  // Handle connection drag end - show menu if not connected to a target
  const onConnectEnd: OnConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent | null) => {
      // If we have a pending connection and the event target is the pane (not a node)
      if (pendingConnectionRef.current && event) {
        const target = event.target as HTMLElement
        // Check if the click was on the pane itself (not on a node)
        const isPaneClick = target.closest('.react-flow__pane') !== null
        const isNodeClick = target.closest('.react-flow__node') !== null

        if (isPaneClick && !isNodeClick) {
          const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
          const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
          setAddNodeMenu({
            x: clientX,
            y: clientY,
            sourceNodeId: pendingConnectionRef.current.sourceNodeId,
            sourceHandleId: pendingConnectionRef.current.sourceHandleId,
          })
        }
      }
      pendingConnectionRef.current = null
    },
    []
  )

  const handleAddNodeFromMenu = useCallback(
    (type: string) => {
      if (!addNodeMenu) return
      // Convert screen coordinates to flow coordinates
      const viewport = getViewport()
      const x = (addNodeMenu.x - viewport.x) / viewport.zoom - NODE_WIDTH / 2
      const y = (addNodeMenu.y - viewport.y) / viewport.zoom - NODE_HEIGHT / 2
      if (addNodeMenu.sourceNodeId) {
        addNodeWithConnection(type, { x, y }, addNodeMenu.sourceNodeId, addNodeMenu.sourceHandleId)
      } else {
        addNode(type, { x, y })
      }
      setAddNodeMenu(null)
    },
    [addNodeMenu, getViewport, addNodeWithConnection, addNode]
  )

  const handlePaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    event.preventDefault()
    const target = event.target as HTMLElement
    const isNodeClick = target.closest('.react-flow__node') !== null
    if (!isNodeClick) {
      const clientX = 'clientX' in event ? event.clientX : 0
      const clientY = 'clientY' in event ? event.clientY : 0
      setAddNodeMenu({
        x: clientX,
        y: clientY,
        sourceNodeId: '',
        sourceHandleId: '',
      })
    }
  }, [])

  return (
    <div className="page-container">
      {isLoading && (
        <div className="canvas-loading">
          <span>加载中...</span>
        </div>
      )}
      <HeaderBar canvasName={canvasName} onCanvasNameChange={setCanvasName} />
      <Sidebar onAddNode={addNode} />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onMoveEnd={handleMoveEnd}
        onDoubleClick={(e) => e.stopPropagation()}
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
        onPaneClick={() => window.dispatchEvent(new CustomEvent('closeAllMenus'))}
        onPaneContextMenu={handlePaneContextMenu}
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

      <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
      <VideoPreviewModal videoUrl={previewVideo} onClose={() => setPreviewVideo(null)} />

      {addNodeMenu && (
        <AddNodeMenu
          x={addNodeMenu.x}
          y={addNodeMenu.y}
          onSelect={handleAddNodeFromMenu}
          onClose={() => setAddNodeMenu(null)}
        />
      )}

      <ChatDrawer />
    </div>
  )
}
