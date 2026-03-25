import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

export default function App() {
  return (
    <ReactFlowProvider>
      <div style={{ width: '100vw', height: '100vh' }}>
        <ReactFlow
          defaultNodes={[]}
          defaultEdges={[]}
          fitView
          proOptions={{ hideAttribution: true }}
          style={{ background: '#1a1a1a' }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="rgba(255, 255, 255, 0.15)"
          />
          <Controls
            style={{
              background: 'rgba(30, 30, 30, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
            }}
            showZoom
            showFitView
            showInteractive={false}
          />
          <MiniMap
            nodeColor="rgba(100, 100, 100, 0.5)"
            maskColor="rgba(0, 0, 0, 0.6)"
            style={{
              background: 'rgba(30, 30, 30, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
            }}
          />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  )
}
