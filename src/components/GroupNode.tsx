import { memo, useCallback, useState, useRef, useEffect } from 'react'
import { Handle, Position, useReactFlow, Node } from '@xyflow/react'
import { NodeHeader } from './NodeHeader'
import { ResizeHandle } from './ResizeHandle'
import { NodeAIInput } from './NodeAIInput'
import { useNodeUpdates } from '../hooks/useNodeUpdates'
import { HANDLE_SIZE, NODE_MIN_WIDTH, NODE_MIN_HEIGHT, NODE_WIDTH, NODE_HEIGHT } from '../constants'
import { PlusIcon } from '../icons'
import { NODE_TYPES_META } from '../nodeTypes'
import type { NodeType } from '../types'

interface GroupNodeProps {
  data: {
    label: string
    type: string
    childNodeIds?: string[]
  }
  selected: boolean
  id: string
}

export const GroupNode = memo(function GroupNode({ data, selected, id }: GroupNodeProps) {
  const { setNodes, getNodes } = useReactFlow()
  const { onResize } = useNodeUpdates(id)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const nodeRef = useRef<HTMLDivElement>(null)
  const addBtnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Get child nodes
  const childNodes = getNodes().filter((n) => n.parentId === id)

  // Filter out group type from available node types for adding to group
  const availableNodeTypes = NODE_TYPES_META.filter((t) => t.id !== 'group')

  // Calculate bounds of all children to auto-resize
  const updateGroupSize = useCallback(() => {
    if (childNodes.length === 0) return

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity

    childNodes.forEach((child) => {
      const childWidth = (child.style?.width as number) || NODE_MIN_WIDTH
      const childHeight = (child.style?.height as number) || NODE_MIN_HEIGHT
      minX = Math.min(minX, child.position.x)
      minY = Math.min(minY, child.position.y)
      maxX = Math.max(maxX, child.position.x + childWidth)
      maxY = Math.max(maxY, child.position.y + childHeight)
    })

    // Add padding
    const padding = 20
    const headerHeight = 44
    const newWidth = Math.max(NODE_MIN_WIDTH, maxX - minX + padding * 2)
    const newHeight = Math.max(NODE_MIN_HEIGHT, maxY - minY + headerHeight + padding * 2)

    if (nodeRef.current) {
      nodeRef.current.style.width = `${newWidth}px`
      nodeRef.current.style.height = `${newHeight}px`
      onResize(id, newWidth, newHeight)
    }
  }, [childNodes, id, onResize])

  // Auto-resize when children change
  useEffect(() => {
    updateGroupSize()
  }, [childNodes.length, updateGroupSize])

  // Handle drag over for drop zone visual feedback
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  // Handle drop - add node to group
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const nodeId = e.dataTransfer.getData('application/reactflow')
      if (!nodeId) return

      const targetNode = getNodes().find((n) => n.id === nodeId)
      if (!targetNode) return

      // Don't allow nested groups
      if (targetNode.type === 'group') return

      // Don't allow if already a child of this group
      if (targetNode.parentId === id) return

      // Get current group position
      const groupNode = getNodes().find((n) => n.id === id)
      if (!groupNode) return

      // Calculate relative position
      const padding = 20
      const headerHeight = 44
      const relX = (e.clientX - (nodeRef.current?.getBoundingClientRect().left || 0) - padding) + (groupNode.position.x)
      const relY = (e.clientY - (nodeRef.current?.getBoundingClientRect().top || 0) - headerHeight - padding) + (groupNode.position.y)

      // Update the dropped node to be a child of this group
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === nodeId) {
            return {
              ...n,
              parentId: id,
              extent: 'parent' as const,
              position: {
                x: Math.max(padding, relX - groupNode.position.x),
                y: Math.max(headerHeight + padding, relY - groupNode.position.y),
              },
            }
          }
          return n
        })
      )
    },
    [id, getNodes, setNodes]
  )

  // Handle add button click - show menu
  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (addBtnRef.current) {
      const rect = addBtnRef.current.getBoundingClientRect()
      setMenuPosition({ x: rect.left, y: rect.top + rect.height + 4 })
    }
    setShowAddMenu(true)
  }, [])

  // Handle menu item selection
  const handleAddNode = useCallback(
    (type: string) => {
      setShowAddMenu(false)

      const groupNode = getNodes().find((n) => n.id === id)
      if (!groupNode) return

      const padding = 20
      const headerHeight = 44

      // Calculate position for new node - stack below existing children or at top-left
      let newX = padding
      let newY = headerHeight + padding

      if (childNodes.length > 0) {
        // Find the bottommost child and place new node below it
        let maxY = 0
        childNodes.forEach((child) => {
          const childHeight = (child.style?.height as number) || NODE_MIN_HEIGHT
          maxY = Math.max(maxY, child.position.y + childHeight)
        })
        newY = maxY + 20
      }

      const nodeType = type as NodeType
      const newNode: Node = {
        id: `${Date.now()}`,
        type: nodeType,
        position: { x: newX, y: newY },
        parentId: id,
        extent: 'parent' as const,
        data: {
          label: `${type === 'text' ? '文本' : type === 'image' ? '图片' : type === 'video' ? '视频' : '音频'}节点`,
          type: nodeType,
          ...(type === 'text' && { content: '' }),
          ...(type === 'image' && { imageUrl: '' }),
          ...(type === 'video' && { videoUrl: '' }),
          ...(type === 'audio' && { audioUrl: '' }),
        },
        style: { width: NODE_WIDTH, height: NODE_HEIGHT },
      }

      setNodes((nds) => [...nds, newNode])
    },
    [id, getNodes, setNodes, childNodes]
  )

  // Close menu when clicking outside
  useEffect(() => {
    if (!showAddMenu) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false)
      }
    }
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [showAddMenu])

  return (
    <>
      <div
        ref={nodeRef}
        className={`custom-node group-node${selected ? ' selected' : ''}${isDragOver ? ' drag-over' : ''}`}
        data-id={id}
        style={{ width: '100%', height: '100%' }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <NodeHeader id={id} type="group" label={data.label} />
        <div className="group-body">
          {childNodes.length === 0 && (
            <div className="group-empty-state">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
              <span>拖拽节点到此处</span>
            </div>
          )}
          <button
            ref={addBtnRef}
            className="group-add-btn"
            title="添加节点到分组"
            onClick={handleAddClick}
          >
            <PlusIcon />
          </button>
        </div>
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          className="node-handle"
          style={{
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            border: '2px solid #8b5cf6',
            background: '#2a2a2a',
          }}
        />
        <ResizeHandle nodeId={id} onResize={onResize} />
        <NodeAIInput nodeId={id} visible={selected} />
      </div>

      {/* Add Node Menu */}
      {showAddMenu && (
        <div
          ref={menuRef}
          className="group-add-menu"
          style={{
            position: 'fixed',
            left: menuPosition.x,
            top: menuPosition.y,
            zIndex: 1001,
          }}
        >
          {availableNodeTypes.map((node) => (
            <button
              key={node.id}
              className="group-add-menu-item"
              onClick={(e) => {
                e.stopPropagation()
                handleAddNode(node.id)
              }}
            >
              <div className="group-add-menu-icon">
                <node.icon />
              </div>
              <div className="group-add-menu-content">
                <span className="group-add-menu-label">{node.label}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  )
})
