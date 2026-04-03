import { useCallback } from 'react'
import { useReactFlow, Handle, Position } from '@xyflow/react'
import { NodeTypeIcon, EditIcon, CloseIcon } from '../icons'
import { NODE_TYPE_MAP } from '../nodeTypes'
import { HANDLE_SIZE } from '../constants'

interface NodeHeaderProps {
  id: string
  type: string
  label: string
  onLabelChange?: (newLabel: string) => void
  onOpenEdit?: () => void
}

export function NodeHeader({ id, type, label, onLabelChange, onOpenEdit }: NodeHeaderProps) {
  const { setNodes } = useReactFlow()
  const meta = NODE_TYPE_MAP[type]

  const handleDelete = useCallback(() => {
    setNodes((nds) => nds.filter((n) => n.id !== id))
  }, [setNodes, id])

  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (onOpenEdit) {
      onOpenEdit()
    }
  }, [onOpenEdit])

  return (
    <div className={`node-header ${type}-header`}>
      <NodeTypeIcon type={type} />
      <span className={`node-label ${type}-label`}>
        {label || meta?.label}
      </span>
      <button
        className="node-edit-btn"
        title="编辑节点"
        onClick={handleEditClick}
      >
        <EditIcon />
      </button>
      <button
        className="node-delete-btn"
        title="删除节点"
        onClick={(e) => {
          e.stopPropagation()
          handleDelete()
        }}
      >
        <CloseIcon />
      </button>
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
    </div>
  )
}
