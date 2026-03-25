import { useState } from 'react'

// Icons as SVG components
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"></path>
    <path d="M12 5v14"></path>
  </svg>
)

const TypeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v16"></path>
    <path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2"></path>
    <path d="M9 20h6"></path>
  </svg>
)

const ImageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
    <circle cx="9" cy="9" r="2"></circle>
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
  </svg>
)

const VideoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"></path>
    <rect x="2" y="6" width="14" height="12" rx="2"></rect>
  </svg>
)

const MusicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13"></path>
    <circle cx="6" cy="18" r="3"></circle>
    <circle cx="18" cy="16" r="3"></circle>
  </svg>
)

const FileTextIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path>
    <path d="M14 2v5a1 1 0 0 0 1 1h5"></path>
    <path d="M10 9H8"></path>
    <path d="M16 13H8"></path>
    <path d="M16 17H8"></path>
  </svg>
)

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v12"></path>
    <path d="m17 8-5-5-5 5"></path>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
  </svg>
)

const LibraryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m16 6 4 14"></path>
    <path d="M12 6v14"></path>
    <path d="M8 8v12"></path>
    <path d="M4 4v16"></path>
  </svg>
)

const LayoutGridIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="7" height="7" x="3" y="3" rx="1"></rect>
    <rect width="7" height="7" x="14" y="3" rx="1"></rect>
    <rect width="7" height="7" x="14" y="14" rx="1"></rect>
    <rect width="7" height="7" x="3" y="14" rx="1"></rect>
  </svg>
)

const FolderOpenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"></path>
  </svg>
)

const HistoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
    <path d="M3 3v5h5"></path>
    <path d="M12 7v5l4 2"></path>
  </svg>
)

const QuestionIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
    <path d="M12 17h.01"></path>
  </svg>
)

const MessageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"></path>
  </svg>
)

interface SidebarProps {
  onAddNode: (type: string) => void
}

export default function Sidebar({ onAddNode }: SidebarProps) {
  const [showAddMenu, setShowAddMenu] = useState(false)

  const nodeTypes = [
    { id: 'text', label: '文本', desc: '剧本、广告词、品牌文案', icon: TypeIcon },
    { id: 'image', label: '图片', desc: '海报、分镜、角色设计', icon: ImageIcon },
    { id: 'video', label: '视频', desc: '创意广告、动画、电影', icon: VideoIcon },
    { id: 'audio', label: '音频', desc: '音效、配音、音乐', icon: MusicIcon },
    { id: 'script', label: '脚本', desc: '创意脚本、生成故事板', icon: FileTextIcon, badge: 'Beta' },
  ]

  const resources = [
    { id: 'upload', label: '上传', desc: '可上传图片、视频、音频文件', icon: UploadIcon },
    { id: 'library', label: '从图库选择', desc: '从历史生成中选择素材', icon: LibraryIcon },
  ]

  return (
    <div className="canvas-sidebar">
      {/* Add Node Button with Dropdown */}
      <div className="sidebar-add-wrapper">
        <button
          className={`sidebar-btn add-btn ${showAddMenu ? 'active' : ''}`}
          aria-label="添加节点"
          onClick={() => setShowAddMenu(!showAddMenu)}
        >
          <PlusIcon />
        </button>

        {showAddMenu && (
          <>
            {/* Backdrop */}
            <div
              className="add-menu-backdrop"
              onClick={() => setShowAddMenu(false)}
            />

            {/* Dropdown Menu */}
            <div className="add-menu-dropdown">
              <h4 className="add-menu-title">添加节点</h4>

              {nodeTypes.map((node) => (
                <button
                  key={node.id}
                  className="add-menu-item"
                  onClick={() => {
                    onAddNode(node.id)
                    setShowAddMenu(false)
                  }}
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
                  onClick={() => {
                    onAddNode(res.id)
                    setShowAddMenu(false)
                  }}
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
          </>
        )}
      </div>

      {/* Other sidebar buttons */}
      <button className="sidebar-btn" aria-label="打开工具箱">
        <LayoutGridIcon />
      </button>

      <button className="sidebar-btn" aria-label="我的素材">
        <FolderOpenIcon />
      </button>

      <button className="sidebar-btn" aria-label="历史记录">
        <HistoryIcon />
      </button>

      <div className="sidebar-divider"></div>

      <button className="sidebar-btn" aria-label="教程">
        <QuestionIcon />
      </button>

      <button className="sidebar-btn" aria-label="联系客服">
        <MessageIcon />
      </button>
    </div>
  )
}
