import { useCallback, useState, useEffect } from 'react'
import { useReactFlow, Viewport, Node, NodeMouseHandler } from '@xyflow/react'

import HeaderBar from '../components/HeaderBar'
import Sidebar from '../components/Sidebar'
import ControlBar from '../components/ControlBar'
import ChatDrawer from '../components/ChatDrawer'
import { ImagePreviewModal, VideoPreviewModal } from '../components/CanvasModals'
import { AddNodeMenu } from '../components/AddNodeMenu'
import { useCanvasContext } from '../contexts/CanvasContext'
import { useNotification } from '../contexts/NotificationContext'
import { DEFAULT_ZOOM } from '../constants'
import {
  useCanvasId,
  useCanvasData,
  useCanvasAutoSave,
} from '../hooks/useCanvas'
import { useConnectionHandler } from '../hooks/canvas/useConnectionHandler'
import { CanvasRenderer } from '../components/canvas/CanvasRenderer'
import { getCanvasById, saveCanvasMeta, getProjects, CanvasInfo, ProjectInfoData } from '../utils/tauriApi'

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

  // Canvas settings modal
  const [showSettings, setShowSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState({ name: '', projectId: '' })
  const [projects, setProjects] = useState<ProjectInfoData[]>([])
  const [canvasInfo, setCanvasInfo] = useState<CanvasInfo | null>(null)
  const [saving, setSaving] = useState(false)
  const { success: showSuccess, error: showError } = useNotification()

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

  // Load settings data
  const loadSettingsData = useCallback(async () => {
    if (!canvasId) return
    try {
      const [canvas, projectList] = await Promise.all([
        getCanvasById(canvasId),
        getProjects(),
      ])
      setCanvasInfo(canvas)
      setProjects(projectList)
      setSettingsForm({
        name: canvas.name,
        projectId: canvas.project_id || '',
      })
    } catch (err) {
      console.error('[Canvas] Failed to load settings:', err)
    }
  }, [canvasId])

  const openSettings = useCallback(() => {
    loadSettingsData()
    setShowSettings(true)
  }, [loadSettingsData])

  const handleSaveSettings = async () => {
    if (!canvasInfo || !settingsForm.name.trim() || saving) return
    try {
      setSaving(true)
      const updated: CanvasInfo = {
        ...canvasInfo,
        name: settingsForm.name.trim(),
        project_id: settingsForm.projectId || null,
        updated_at: new Date().toISOString(),
      }
      await saveCanvasMeta(updated)
      setCanvasInfo(updated)
      setCanvasName(settingsForm.name.trim())
      setShowSettings(false)
      showSuccess('画布设置已保存')
    } catch (err) {
      console.error('[Canvas] Failed to save settings:', err)
      showError('保存失败')
    } finally {
      setSaving(false)
    }
  }

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
      <HeaderBar canvasName={canvasName} onCanvasNameChange={setCanvasName} onOpenSettings={openSettings} />

      {/* Canvas Settings Modal */}
      {showSettings && (
        <div className="confirm-modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="confirm-modal canvas-settings-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-modal-title">画布设置</h3>

            <div className="field-group" style={{ marginBottom: '16px' }}>
              <label>画布名称</label>
              <div className="input-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                  <path d="M3 9h18"></path>
                  <path d="M9 21V9"></path>
                </svg>
                <input
                  type="text"
                  className="config-input"
                  placeholder="输入画布名称"
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveSettings()}
                  autoFocus
                />
              </div>
            </div>

            <div className="field-group" style={{ marginBottom: '16px' }}>
              <label>所属项目</label>
              <div className="input-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"></path>
                </svg>
                <select
                  className="config-input"
                  value={settingsForm.projectId}
                  onChange={(e) => setSettingsForm({ ...settingsForm, projectId: e.target.value })}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">无（独立画布）</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="confirm-modal-actions">
              <button className="confirm-modal-btn cancel" onClick={() => setShowSettings(false)}>
                取消
              </button>
              <button
                className="confirm-modal-btn confirm"
                onClick={handleSaveSettings}
                disabled={!settingsForm.name.trim() || saving}
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

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