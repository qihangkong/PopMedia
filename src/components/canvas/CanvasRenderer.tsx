import { ReactNode } from 'react'
import { ReactFlow, Background, BackgroundVariant, MiniMap } from '@xyflow/react'
import type { Node, Edge, Viewport, NodeMouseHandler } from '@xyflow/react'
import type { Connection } from '@xyflow/react'
import {
  GRID_SIZE,
  GRID_SNAP,
  MAX_ZOOM,
  FIT_VIEW_PADDING,
} from '../../constants'
import { nodeTypes } from './nodeTypes'
import { edgeTypes } from './CustomBezierEdge'

interface CanvasRendererProps {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: (changes: any) => void
  onEdgesChange: (changes: any) => void
  onConnect: (connection: Connection) => void
  onConnectStart: any
  onConnectEnd: any
  onMoveEnd: (event: MouseEvent | TouchEvent | null, viewport: Viewport) => void
  onNodeContextMenu: NodeMouseHandler<Node>
  isValidConnection: (connection: Edge | Connection) => boolean
  snapToGrid: boolean
  onPaneClick: () => void
  onPaneContextMenu: (event: MouseEvent | React.MouseEvent) => void
  showMinimap: boolean
  children?: ReactNode
}

export function CanvasRenderer({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onConnectStart,
  onConnectEnd,
  onMoveEnd,
  onNodeContextMenu,
  isValidConnection,
  snapToGrid,
  onPaneClick,
  onPaneContextMenu,
  showMinimap,
  children,
}: CanvasRendererProps) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onConnectStart={onConnectStart}
      onConnectEnd={onConnectEnd}
      onMoveEnd={onMoveEnd}
      onDoubleClick={(e) => e.stopPropagation()}
      onNodeContextMenu={onNodeContextMenu}
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
      onPaneClick={onPaneClick}
      onPaneContextMenu={onPaneContextMenu}
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
      {children}
    </ReactFlow>
  )
}