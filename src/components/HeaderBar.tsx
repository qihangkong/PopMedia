import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

interface HeaderBarProps {
  canvasName?: string
  onCanvasNameChange?: (name: string) => void
}

export default function HeaderBar({ canvasName = '', onCanvasNameChange }: HeaderBarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [showBrandMenu, setShowBrandMenu] = useState(false)
  const brandRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭品牌菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) {
        setShowBrandMenu(false)
      }
    }
    const handleCloseMenus = () => setShowBrandMenu(false)

    if (showBrandMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    window.addEventListener('closeAllMenus', handleCloseMenus)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('closeAllMenus', handleCloseMenus)
    }
  }, [showBrandMenu])

  const menuItems = [
    { path: '/', label: 'Home', icon: 'home' },
    { path: '/projects', label: '项目', icon: 'folder' },
    { path: '/settings', label: '设置', icon: 'settings' },
  ]

  // 获取当前页面名称
  const getIcon = (icon: string) => {
    switch (icon) {
      case 'home':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"></path>
            <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          </svg>
        )
      case 'folder':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"></path>
          </svg>
        )
      case 'settings':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        )
      default:
        return null
    }
  }

  const handleMenuClick = (path: string) => {
    navigate(path)
    setShowBrandMenu(false)
  }

  return (
    <div className="canvas-header-bar">
      <div className="canvas-header-inner" ref={brandRef}>
        <img className="canvas-header-icon" src="/PopMedia.png" alt="PopMedia" />
        <button
          className="canvas-header-brand"
          onClick={() => setShowBrandMenu(!showBrandMenu)}
        >
          PopMedia
        </button>
        <span className="canvas-header-sep">|</span>
        {location.pathname === '/canvas' ? (
          <span
            className="canvas-header-canvas-name"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onCanvasNameChange?.(e.currentTarget.textContent || '')}
            onClick={(e) => e.stopPropagation()}
          >
            {canvasName || '未命名的画布'}
          </span>
        ) : (
          <span className="canvas-header-canvas-name">
            {menuItems.find(item => item.path === location.pathname)?.label || ''}
          </span>
        )}
      </div>
      {/* 品牌下拉菜单 */}
      {showBrandMenu && (
        <div className="brand-dropdown" onMouseDown={(e) => e.stopPropagation()}>
          {menuItems.map((item) => (
            <button
              key={item.path}
              className={`brand-dropdown-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => handleMenuClick(item.path)}
            >
              {getIcon(item.icon)}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
