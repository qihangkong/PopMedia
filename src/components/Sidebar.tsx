import { useState } from 'react'

import {
  PlusIcon,
  UploadIcon,
  LibraryIcon,
  LayoutGridIcon,
  FolderOpenIcon,
  HistoryIcon,
  QuestionIcon,
  MessageIcon,
} from '../icons'
import { NODE_TYPES_META } from '../nodeTypes'

interface SidebarProps {
  onAddNode: (type: string) => void
}

export default function Sidebar({ onAddNode }: SidebarProps) {
  const [showAddMenu, setShowAddMenu] = useState(false)

  // 节点类型菜单 — 从 nodeTypes.ts 统一导入
  const nodeMenuItems = NODE_TYPES_META

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

              {nodeMenuItems.map((node) => (
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
      <button className="sidebar-btn" aria-label="联系客服">
        <MessageIcon />
      </button>
    </div>
  )
}
