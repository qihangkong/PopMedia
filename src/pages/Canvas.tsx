import { useCallback, useState, useEffect } from 'react'
import { useReactFlow, Viewport, Node, NodeMouseHandler } from '@xyflow/react'

import HeaderBar from '../components/HeaderBar'
import Sidebar from '../components/Sidebar'
import ControlBar from '../components/ControlBar'
import ChatDrawer from '../components/ChatDrawer'
import { ImagePreviewModal, VideoPreviewModal } from '../components/CanvasModals'
import { AddNodeMenu } from '../components/AddNodeMenu'
import { useCanvasContext } from '../contexts/CanvasContext'
import { DEFAULT_ZOOM } from '../constants'
import {
  useCanvasId,
  useCanvasData,
  useCanvasAutoSave,
} from '../hooks/useCanvas'
import { useConnectionHandler } from '../hooks/canvas/useConnectionHandler'
import { CanvasRenderer } from '../components/canvas/CanvasRenderer'

interface AddNodeMenuState {
  x: number
  y: number
  sourceNodeId: string
  sourceHandleId: string
}

export default function Canvas() {
  const [showMinimap, setShowMinimap] = useState(true)
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)

  const [addNodeMenu, setAddNodeMenu] = useState<AddNodeMenuState | null>(null)

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
  const { canvasId, isLoading, isInitializedRef } = useCanvasId(loadCanvas)

  const {
    canvasName,
    setCanvasName,
    initCanvasName,
    onNodeContextMenu,
    previewImage,
    onPreviewImage,
    previewVideo,
    onPreviewVideo,
    onCloseAllMenus,
  } = useCanvasContext()

  // Handle node context menu from React Flow
  const handleNodeContextMenu: NodeMouseHandler<Node> = useCallback((event, node) => {
    event.preventDefault()
    event.stopPropagation()
    const nodeType = node.type || 'text'
    onNodeContextMenu(node.id, nodeType, event.clientX, event.clientY)
  }, [onNodeContextMenu])

  // Initialize canvas name from backend when canvasId changes
  useEffect(() => {
    if (canvasId) {
      initCanvasName(canvasId)
    }
  }, [canvasId, initCanvasName])

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

  const {
    onConnectStart,
    onConnectEnd,
    handleAddNodeFromMenu,
    handlePaneContextMenu,
  } = useConnectionHandler({
    addNodeMenu,
    setAddNodeMenu,
    addNode,
    addNodeWithConnection,
  })

  const handlePaneClick = useCallback(() => {
    onCloseAllMenus()
    setAddNodeMenu(null)
  }, [onCloseAllMenus])

  return (
    <div className="page-container">
      {isLoading && (
        <div className="canvas-loading">
          <span>加载中...</span>
        </div>
      )}
      <HeaderBar canvasName={canvasName} onCanvasNameChange={setCanvasName} />
      <Sidebar onAddNode={addNode} />

      <CanvasRenderer
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onMoveEnd={handleMoveEnd}
        onNodeContextMenu={handleNodeContextMenu}
        isValidConnection={isValidConnection}
        snapToGrid={snapToGrid}
        onPaneClick={handlePaneClick}
        onPaneContextMenu={handlePaneContextMenu}
        showMinimap={showMinimap}
      >
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
      </CanvasRenderer>

      <ImagePreviewModal imageUrl={previewImage} onClose={() => onPreviewImage('')} />
      <VideoPreviewModal videoUrl={previewVideo} onClose={() => onPreviewVideo('')} />

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

// Re-export nodeTypes and edgeTypes for external use
export { nodeTypes } from '../components/canvas/nodeTypes'
export { edgeTypes } from '../components/canvas/CustomBezierEdge'