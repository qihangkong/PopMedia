import { useState } from 'react'

import {
  PlusIcon,
  TypeIcon,
  ImageIcon,
  VideoIcon,
  MusicIcon,
  FileTextIcon,
  UploadIcon,
  LibraryIcon,
  LayoutGridIcon,
  FolderOpenIcon,
  HistoryIcon,
  QuestionIcon,
  MessageIcon,
} from '../icons'

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
