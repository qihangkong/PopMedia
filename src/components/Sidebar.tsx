import { useState, useEffect, useRef, useCallback } from 'react'

import {
  PlusIcon,
  LayoutGridIcon,
  FolderOpenIcon,
  HistoryIcon,
  QuestionIcon,
} from '../icons'
import { AddNodeMenu } from './AddNodeMenu'
import { useChat } from '../contexts/ChatContext'
import { useClickOutside } from '../hooks/useClickOutside'

interface SidebarProps {
  onAddNode: (type: string) => void
}

export default function Sidebar({ onAddNode }: SidebarProps) {
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [addMenuPosition, setAddMenuPosition] = useState({ x: 0, y: 0 })
  const { toggleChat, isOpen } = useChat()
  const addMenuRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭添加节点菜单
  const handleCloseAddMenu = useCallback(() => setShowAddMenu(false), [])

  // 处理添加节点菜单的显示
  const handleShowAddMenu = useCallback(() => {
    const button = addMenuRef.current?.querySelector('button')
    if (button) {
      const rect = button.getBoundingClientRect()
      setAddMenuPosition({
        x: rect.right + 8,
        y: rect.top,
      })
    }
    setShowAddMenu(true)
  }, [])

  useClickOutside(addMenuRef, handleCloseAddMenu, showAddMenu)

  useEffect(() => {
    const handleCloseMenus = () => setShowAddMenu(false)
    window.addEventListener('closeAllMenus', handleCloseMenus)
    return () => window.removeEventListener('closeAllMenus', handleCloseMenus)
  }, [])

  const handleAddNodeSelect = useCallback((type: string) => {
    onAddNode(type)
    setShowAddMenu(false)
  }, [onAddNode])

  return (
    <div className="canvas-sidebar">
      {/* Add Node Button with Dropdown */}
      <div className="sidebar-add-wrapper" ref={addMenuRef}>
        <button
          className={`sidebar-btn add-btn ${showAddMenu ? 'active' : ''}`}
          aria-label="添加节点"
          onClick={handleShowAddMenu}
        >
          <PlusIcon />
        </button>

        {showAddMenu && (
          <AddNodeMenu
            x={addMenuPosition.x}
            y={addMenuPosition.y}
            onSelect={handleAddNodeSelect}
            onClose={() => setShowAddMenu(false)}
          />
        )}
      </div>

      {/* Other sidebar buttons — TODO: implement functionality */}
      {/* 工具箱 */}
      <button className="sidebar-btn" aria-label="打开工具箱">
        <LayoutGridIcon />
      </button>

      {/* 我的素材 */}
      <button className="sidebar-btn" aria-label="我的素材">
        <FolderOpenIcon />
      </button>

      {/* 历史记录 */}
      <button className="sidebar-btn" aria-label="历史记录">
        <HistoryIcon />
      </button>

      <div className="sidebar-divider"></div>

      {/* 教程 */}
      <button className="sidebar-btn" aria-label="教程">
        <QuestionIcon />
      </button>

      {/* 联系客服 */}
      <button className={`sidebar-btn ${isOpen ? 'active' : ''}`} aria-label="AI 助手" onClick={toggleChat}>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
    </div>
  )
}