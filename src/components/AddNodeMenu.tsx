import { useEffect, useMemo, useRef } from 'react'
import { MENU_Z_INDEX } from '../constants'
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
    const menuWidth = 240
    const padding = 10
    const menuHeight = menuRef.current?.scrollHeight || 420

    let left = x
    let top = y

    // Ensure menu stays within viewport
    if (left + menuWidth > window.innerWidth - padding) {
      left = window.innerWidth - menuWidth - padding
    }
    if (left < padding) {
      left = padding
    }
    if (top + menuHeight > window.innerHeight - padding) {
      top = window.innerHeight - menuHeight - padding
    }
    if (top < padding) {
      top = padding
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
    if (type === 'script') {
      // Script is Beta - TODO: implement notification system
      onClose()
      return
    }
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