import { useCallback, useState } from 'react'
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
import { NodeContextMenu, ImagePreviewModal, VideoPreviewModal } from '../components/CanvasModals'
import {
  GRID_SIZE,
  GRID_SNAP,
  DEFAULT_ZOOM,
  MAX_ZOOM,
  FIT_VIEW_PADDING,
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

  const { zoomIn, zoomOut, getViewport, setViewport } = useReactFlow()
  const {
    nodes,
    onNodesChange,
    edges,
    onEdgesChange,
    onConnect,
    isValidConnection,
    addNode,
    loadCanvas,
    saveCanvas,
  } = useCanvasData()
  const { canvasId, canvasName, setCanvasName, isLoading, isInitializedRef } = useCanvasId(loadCanvas)
  const {
    contextMenu,
    setContextMenu,
    previewImage,
    setPreviewImage,
    previewVideo,
    setPreviewVideo,
    handleUploadMedia,
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

      <NodeContextMenu
        nodeId={contextMenu?.nodeId ?? ''}
        nodeType={contextMenu?.nodeType ?? ''}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        onUploadMedia={handleUploadMedia}
        onClose={() => setContextMenu(null)}
      />

      <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
      <VideoPreviewModal videoUrl={previewVideo} onClose={() => setPreviewVideo(null)} />

      <ChatDrawer />
    </div>
  )
}
