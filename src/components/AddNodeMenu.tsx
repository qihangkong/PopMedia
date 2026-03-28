import { useEffect, useState, useMemo, useRef } from 'react'
import { MENU_Z_INDEX } from '../constants'
import { NODE_TYPES_META, type NodeTypeMeta } from '../nodeTypes'
import { UploadIcon, LibraryIcon } from '../icons'

interface AddNodeMenuProps {
  x: number
  y: number
  onSelect: (type: string) => void
  onClose: () => void
}

interface ResourceItem {
  id: string
  label: string
  desc: string
  icon: React.ComponentType
  action: () => void
}

export function AddNodeMenu({ x, y, onSelect, onClose }: AddNodeMenuProps) {
  const [isReady, setIsReady] = useState(false)
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

  // Delay before responding to closeAllMenus to avoid race with onConnectEnd
  useEffect(() => {
    const timeout = setTimeout(() => setIsReady(true), 100)
    return () => clearTimeout(timeout)
  }, [])

  // Listen for closeAllMenus event (triggered by ReactFlow onPaneClick)
  useEffect(() => {
    if (!isReady) return
    const handleCloseAllMenus = () => onClose()
    window.addEventListener('closeAllMenus', handleCloseAllMenus)
    return () => window.removeEventListener('closeAllMenus', handleCloseAllMenus)
  }, [isReady, onClose])

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
      // Script is Beta, show notification and close
      window.dispatchEvent(new CustomEvent('showNotification', {
        detail: { message: '脚本功能正在开发中，敬请期待', type: 'info' }
      }))
      onClose()
      return
    }
    if (type === 'upload') {
      window.dispatchEvent(new CustomEvent('openUploadDialog'))
      onClose()
      return
    }
    if (type === 'library') {
      window.dispatchEvent(new CustomEvent('openGalleryDialog'))
      onClose()
      return
    }
    onSelect(type)
  }

  const resources: ResourceItem[] = [
    {
      id: 'upload',
      label: '上传',
      desc: '可上传图片、视频、音频文件',
      icon: UploadIcon,
      action: () => handleSelect('upload'),
    },
    {
      id: 'library',
      label: '从图库选择',
      desc: '从历史生成中选择素材',
      icon: LibraryIcon,
      action: () => handleSelect('library'),
    },
  ]

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

      <h4 className="add-menu-title">添加资源</h4>

      {resources.map((res) => (
        <button
          key={res.id}
          className="add-menu-item"
          onClick={res.action}
        >
          <div className="add-menu-icon">
            <res.icon />
          </div>
          <div className="add-menu-content">
            <span className="add-menu-label">{res.label}</span>
            <span className="add-menu-desc">{res.desc}</span>
          </div>
        </button>
      ))}
    </div>
  )
}