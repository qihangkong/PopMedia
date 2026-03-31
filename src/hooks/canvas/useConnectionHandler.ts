import { useCallback, useRef } from 'react'
import { useReactFlow, OnConnectStart, OnConnectEnd } from '@xyflow/react'
import { NODE_WIDTH, NODE_HEIGHT } from '../../constants'

interface AddNodeMenuState {
  x: number
  y: number
  sourceNodeId: string
  sourceHandleId: string
}

interface UseConnectionHandlerOptions {
  addNodeMenu: AddNodeMenuState | null
  setAddNodeMenu: (menu: AddNodeMenuState | null) => void
  addNode: (type: string, position?: { x: number; y: number }) => string
  addNodeWithConnection: (
    type: string,
    position: { x: number; y: number },
    sourceNodeId?: string,
    sourceHandleId?: string
  ) => void
}

export function useConnectionHandler({
  addNodeMenu,
  setAddNodeMenu,
  addNode,
  addNodeWithConnection,
}: UseConnectionHandlerOptions) {
  const { getViewport } = useReactFlow()
  const pendingConnectionRef = useRef<{
    sourceNodeId: string
    sourceHandleId: string
  } | null>(null)

  const onConnectStart: OnConnectStart = useCallback((_, params) => {
    if (params.nodeId && params.handleId) {
      pendingConnectionRef.current = {
        sourceNodeId: params.nodeId,
        sourceHandleId: params.handleId,
      }
    }
  }, [])

  const onConnectEnd: OnConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent | null) => {
      if (pendingConnectionRef.current && event) {
        const target = event.target as HTMLElement
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
    [setAddNodeMenu]
  )

  const handleAddNodeFromMenu = useCallback(
    (type: string) => {
      if (!addNodeMenu) return
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
    [addNodeMenu, getViewport, addNodeWithConnection, addNode, setAddNodeMenu]
  )

  const handlePaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
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
    },
    [setAddNodeMenu]
  )

  return {
    pendingConnectionRef,
    onConnectStart,
    onConnectEnd,
    handleAddNodeFromMenu,
    handlePaneContextMenu,
  }
}