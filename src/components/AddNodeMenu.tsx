import { useEffect, useState, useMemo } from 'react'
import { MENU_Z_INDEX } from '../constants'

interface AddNodeMenuProps {
  x: number
  y: number
  onSelect: (type: string) => void
  onClose: () => void
}

export function AddNodeMenu({ x, y, onSelect, onClose }: AddNodeMenuProps) {
  const [isReady, setIsReady] = useState(false)

  // Calculate menu position with boundary detection
  const menuPosition = useMemo(() => {
    const menuWidth = 240
    const menuHeight = 480
    const padding = 10

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
    onSelect(type)
  }

  const handleUpload = () => {
    window.dispatchEvent(new CustomEvent('openUploadDialog'))
    onClose()
  }

  const handleGallery = () => {
    window.dispatchEvent(new CustomEvent('openGalleryDialog'))
    onClose()
  }

  return (
    <div
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
      <button className="add-menu-item" onClick={() => onSelect('text')}>
        <div className="add-menu-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4v16"></path>
            <path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2"></path>
            <path d="M9 20h6"></path>
          </svg>
        </div>
        <div className="add-menu-content">
          <span className="add-menu-label">文本</span>
          <span className="add-menu-desc">剧本、广告词、品牌文案</span>
        </div>
      </button>
      <button className="add-menu-item" onClick={() => onSelect('image')}>
        <div className="add-menu-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
            <circle cx="9" cy="9" r="2"></circle>
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
          </svg>
        </div>
        <div className="add-menu-content">
          <span className="add-menu-label">图片</span>
          <span className="add-menu-desc">海报、分镜、角色设计</span>
        </div>
      </button>
      <button className="add-menu-item" onClick={() => onSelect('video')}>
        <div className="add-menu-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"></path>
            <rect x="2" y="6" width="14" height="12" rx="2"></rect>
          </svg>
        </div>
        <div className="add-menu-content">
          <span className="add-menu-label">视频</span>
          <span className="add-menu-desc">创意广告、动画、电影</span>
        </div>
      </button>
      <button className="add-menu-item" onClick={() => onSelect('audio')}>
        <div className="add-menu-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
        </div>
        <div className="add-menu-content">
          <span className="add-menu-label">音频</span>
          <span className="add-menu-desc">音效、配音、音乐</span>
        </div>
      </button>
      <button className="add-menu-item" onClick={() => handleSelect('script')}>
        <div className="add-menu-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path>
            <path d="M14 2v5a1 1 0 0 0 1 1h5"></path>
            <path d="M10 9H8"></path>
            <path d="M16 13H8"></path>
            <path d="M16 17H8"></path>
          </svg>
        </div>
        <div className="add-menu-content">
          <span className="add-menu-label">脚本<span className="add-menu-badge">Beta</span></span>
          <span className="add-menu-desc">创意脚本、生成故事板</span>
        </div>
      </button>
      <h4 className="add-menu-title">添加资源</h4>
      <button className="add-menu-item" onClick={handleUpload}>
        <div className="add-menu-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12"></path>
            <path d="m17 8-5-5-5 5"></path>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          </svg>
        </div>
        <div className="add-menu-content">
          <span className="add-menu-label">上传</span>
          <span className="add-menu-desc">可上传图片、视频、音频文件</span>
        </div>
      </button>
      <button className="add-menu-item" onClick={handleGallery}>
        <div className="add-menu-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m16 6 4 14"></path>
            <path d="M12 6v14"></path>
            <path d="M8 8v12"></path>
            <path d="M4 4v16"></path>
          </svg>
        </div>
        <div className="add-menu-content">
          <span className="add-menu-label">从图库选择</span>
          <span className="add-menu-desc">从历史生成中选择素材</span>
        </div>
      </button>
    </div>
  )
}
