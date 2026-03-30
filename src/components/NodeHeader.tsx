import { useState, useRef, useCallback } from 'react'
import { useReactFlow, Handle, Position } from '@xyflow/react'
import { NodeTypeIcon, EditIcon, CheckIcon, CloseIcon } from '../icons'
import { NODE_TYPE_MAP } from '../nodeTypes'
import { HANDLE_SIZE } from '../constants'

interface NodeHeaderProps {
  id: string
  type: string
  label: string
  onLabelChange?: (newLabel: string) => void
}

export function NodeHeader({ id, type, label, onLabelChange }: NodeHeaderProps) {
  const { setNodes } = useReactFlow()
  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const labelInputRef = useRef<HTMLInputElement>(null)
  const meta = NODE_TYPE_MAP[type]

  const handleLabelBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const newLabel = e.target.value
      setIsEditingLabel(false)
      if (newLabel === label) return
      if (onLabelChange) {
        onLabelChange(newLabel)
      } else {
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === id) {
              return { ...node, data: { ...node.data, label: newLabel } }
            }
            return node
          })
        )
      }
    },
    [setNodes, id, label, onLabelChange]
  )

  const handleDelete = useCallback(() => {
    if (type === 'group') {
      // For group nodes, delete the group and all its children
      setNodes((nds) => {
        // Find all descendant node IDs (children of this group)
        const childIds = new Set<string>()
        const findChildren = (parentId: string) => {
          nds.forEach((n) => {
            if (n.parentId === parentId) {
              childIds.add(n.id)
              findChildren(n.id)
            }
          })
        }
        findChildren(id)

        // Filter out the group and all its children
        return nds.filter((n) => n.id !== id && !childIds.has(n.id))
      })
    } else {
      setNodes((nds) => nds.filter((n) => n.id !== id))
    }
  }, [setNodes, id, type])

  return (
    <div className={`node-header ${type}-header`}>
      <NodeTypeIcon type={type} />
      <input
        ref={labelInputRef}
        className={`node-label-input ${type}-label-input`}
        defaultValue={label || meta?.label}
        readOnly={!isEditingLabel}
        onBlur={handleLabelBlur}
        onClick={(e) => {
          if (isEditingLabel) e.stopPropagation()
        }}
      />
      <button
        className="node-edit-btn"
        title={isEditingLabel ? '完成编辑' : '编辑名称'}
        onClick={(e) => {
          e.stopPropagation()
          if (isEditingLabel) {
            labelInputRef.current?.blur()
          } else {
            setIsEditingLabel(true)
            setTimeout(() => labelInputRef.current?.select(), 0)
          }
        }}
      >
        {isEditingLabel ? <CheckIcon /> : <EditIcon />}
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
