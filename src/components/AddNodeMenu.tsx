import { useEffect, useMemo, useRef } from 'react'
import { MENU_Z_INDEX, ADD_MENU_WIDTH, ADD_MENU_HEIGHT_DEFAULT, ADD_MENU_PADDING } from '../constants'
import { NODE_TYPES_META, type NodeTypeMeta } from '../nodeTypes'

interface AddNodeMenuProps {
  x: number
  y: number
  onSelect: (type: string) => void
  onClose: () => void
}

export function AddNodeMenu({ x, y, onSelect, onClose }: AddNodeMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Calculate menu position with boundary detection
  // menuRef needed to measure actual height for boundary detection
  const menuPosition = useMemo(() => {
    const menuHeight = menuRef.current?.scrollHeight || ADD_MENU_HEIGHT_DEFAULT

    let left = x
    let top = y

    // Ensure menu stays within viewport
    if (left + ADD_MENU_WIDTH > window.innerWidth - ADD_MENU_PADDING) {
      left = window.innerWidth - ADD_MENU_WIDTH - ADD_MENU_PADDING
    }
    if (left < ADD_MENU_PADDING) {
      left = ADD_MENU_PADDING
    }
    if (top + menuHeight > window.innerHeight - ADD_MENU_PADDING) {
      top = window.innerHeight - menuHeight - ADD_MENU_PADDING
    }
    if (top < ADD_MENU_PADDING) {
      top = ADD_MENU_PADDING
    }

    return { left, top }
  }, [x, y])

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSelect = (type: string) => {
    onSelect(type)
  }

  return (
    <div
      ref={menuRef}
      className="add-menu-dropdown"
      style={{
        position: 'fixed',
        left: menuPosition.left,
        top: menuPosition.top,
        zIndex: MENU_Z_INDEX,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <h4 className="add-menu-title">添加节点</h4>

      {NODE_TYPES_META.map((node: NodeTypeMeta) => (
        <button
          key={node.id}
          className="add-menu-item"
          onClick={() => handleSelect(node.id)}
        >
          <div className="add-menu-icon">
            <node.icon />
          </div>
          <div className="add-menu-content">
            <span className="add-menu-label">
              {node.label}
              {node.badge && <span className="add-menu-badge">{node.badge}</span>}
            </span>
            <span className="add-menu-desc">{node.desc}</span>
          </div>
        </button>
      ))}
    </div>
  )
}