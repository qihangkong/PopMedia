import { useCallback, useState } from 'react'
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
  BezierEdge,
  Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import Sidebar from './components/Sidebar'
import ControlBar from './components/ControlBar'

// Custom node component
function TextNode({ data }: { data: { label: string } }) {
  return (
    <div className="custom-node text-node">
      <Handle type="target" position={Position.Left} id="left" className="node-handle" />
      <div className="node-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 4v16"></path>
          <path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2"></path>
          <path d="M9 20h6"></path>
        </svg>
        <span>{data.label || '文本'}</span>
      </div>
      <div className="node-body">
        <div className="placeholder-text">点击编辑文本内容</div>
      </div>
      <Handle type="source" position={Position.Right} id="right" className="node-handle" />
    </div>
  )
}

function ImageNode({ data }: { data: { label: string } }) {
  return (
    <div className="custom-node image-node">
      <Handle type="target" position={Position.Left} id="left" className="node-handle" />
      <div className="node-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
          <circle cx="9" cy="9" r="2"></circle>
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
        </svg>
        <span>{data.label || '图片'}</span>
      </div>
      <div className="node-body">
        <div className="placeholder-text">点击添加图片</div>
      </div>
      <Handle type="source" position={Position.Right} id="right" className="node-handle" />
    </div>
  )
}

function VideoNode({ data }: { data: { label: string } }) {
  return (
    <div className="custom-node video-node">
      <Handle type="target" position={Position.Left} id="left" className="node-handle" />
      <div className="node-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"></path>
          <rect x="2" y="6" width="14" height="12" rx="2"></rect>
        </svg>
        <span>{data.label || '视频'}</span>
      </div>
      <div className="node-body">
        <div className="placeholder-text">点击添加视频</div>
      </div>
      <Handle type="source" position={Position.Right} id="right" className="node-handle" />
    </div>
  )
}

function AudioNode({ data }: { data: { label: string } }) {
  return (
    <div className="custom-node audio-node">
      <Handle type="target" position={Position.Left} id="left" className="node-handle" />
      <div className="node-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18V5l12-2v13"></path>
          <circle cx="6" cy="18" r="3"></circle>
          <circle cx="18" cy="16" r="3"></circle>
        </svg>
        <span>{data.label || '音频'}</span>
      </div>
      <div className="node-body">
        <div className="placeholder-text">点击添加音频</div>
      </div>
      <Handle type="source" position={Position.Right} id="right" className="node-handle" />
    </div>
  )
}

const nodeTypes = {
  text: TextNode,
  image: ImageNode,
  video: VideoNode,
  audio: AudioNode,
}

const edgeTypes = {
  bezier: BezierEdge,
}

function FlowWithControls() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [showMinimap, setShowMinimap] = useState(true)
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [zoom, setZoom] = useState(1)

  const { zoomIn, zoomOut, fitView, getViewport, setViewport } = useReactFlow()

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
        data: { label: `${type}节点` },
      }
      setNodes((nds) => [...nds, newNode])
    },
    [setNodes]
  )

  const handleMoveEnd = useCallback((_: MouseEvent | TouchEvent, viewport: Viewport) => {
    setZoom(viewport.zoom)
  }, [])

  const setZoomLevel = useCallback((value: number) => {
    const currentViewport = getViewport()
    setViewport({ ...currentViewport, zoom: value })
    setZoom(value)
  }, [getViewport, setViewport])

  return (
    <>
      <Sidebar onAddNode={addNode} />

      <ControlBar
        zoom={zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitView={() => fitView({ padding: 0.2 })}
        onToggleMinimap={() => setShowMinimap(!showMinimap)}
        onToggleSnapGrid={() => setSnapToGrid(!snapToGrid)}
        onSetZoom={setZoomLevel}
        showMinimap={showMinimap}
        snapToGrid={snapToGrid}
      />

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
        fitViewOptions={{ maxZoom: 1, padding: 0.5 }}
        snapToGrid={snapToGrid}
        snapGrid={[20, 20]}
        deleteKeyCode="Delete"
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'bezier' }}
        style={{ background: '#1a1a1a' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(255, 255, 255, 0.15)"
        />
        {showMinimap && (
          <MiniMap
            nodeColor="rgba(100, 100, 100, 0.5)"
            maskColor="rgba(0, 0, 0, 0.6)"
            pannable
            zoomable
            style={{
              background: 'rgba(30, 30, 30, 0.9)',
              borderRadius: 12,
            }}
          />
        )}
      </ReactFlow>
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
