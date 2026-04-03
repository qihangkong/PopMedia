import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import HeaderBar from '../components/HeaderBar'
import { getProjects, getCanvasesByProject, deleteCanvasById, saveProjectMeta, ProjectInfoData, CanvasInfo, getFileUrl } from '../utils/tauriApi'
import { useNotification } from '../contexts/NotificationContext'

// ==================== Project List View ====================

interface ProjectCardProps {
  project: ProjectInfoData
  onClick: () => void
}

function ProjectCard({ project, onClick }: ProjectCardProps) {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).replace(/\//g, '/')
    } catch {
      return dateStr
    }
  }

  return (
    <div className="card" onClick={onClick}>
      <div className="card-thumbnail">
        {project.thumbnail ? (
          <img src={project.thumbnail} alt={project.name} className="card-image" draggable="false" />
        ) : (
          <div className="card-thumbnail-placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"></path>
            </svg>
          </div>
        )}
      </div>
      <div className="card-info">
        <div className="card-title-row">
          <p className="card-title">{project.name}</p>
        </div>
        <p className="card-date">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock" aria-hidden="true">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v6l4 2"></path>
          </svg>
          <span>{formatDate(project.updated_at)}</span>
        </p>
      </div>
    </div>
  )
}

function ProjectListView({ onProjectClick }: { onProjectClick: (project: ProjectInfoData) => void }) {
  const [projects, setProjects] = useState<ProjectInfoData[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [newProjectRatio, setNewProjectRatio] = useState('16:9')
  const [newProjectStyle, setNewProjectStyle] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const data = await getProjects()
      setProjects(data)
    } catch (err) {
      console.error('Failed to load projects:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setNewProjectName('')
    setNewProjectDesc('')
    setNewProjectRatio('16:9')
    setNewProjectStyle('')
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || creating) return
    try {
      setCreating(true)
      const now = new Date().toISOString()
      const newProject: ProjectInfoData = {
        id: crypto.randomUUID(),
        name: newProjectName.trim(),
        thumbnail: null,
        description: newProjectDesc.trim() || null,
        video_ratio: newProjectRatio,
        video_style: newProjectStyle.trim() || null,
        created_at: now,
        updated_at: now,
      }
      const saved = await saveProjectMeta(newProject)
      setProjects(prev => [saved, ...prev])
      setShowCreateModal(false)
      resetForm()
    } catch (err) {
      console.error('Failed to create project:', err)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="page-content">
        <p>加载中...</p>
      </div>
    )
  }

  return (
    <div className="home-content">
      <div className="recent-section">
        <div className="section-header">
          <div className="section-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-folder-open" aria-hidden="true">
              <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>我的项目</span>
          </div>
        </div>
        <div className="cards-grid">
          {/* 创建新项目卡片 */}
          <div className="card card-create" onClick={() => setShowCreateModal(true)}>
            <div className="card-create-inner">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F7F7F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus" aria-hidden="true">
                <path d="M5 12h14"></path>
                <path d="M12 5v14"></path>
              </svg>
              <span>创建项目</span>
            </div>
          </div>
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => onProjectClick(project)}
            />
          ))}
        </div>
      </div>

      {/* 创建项目弹窗 */}
      {showCreateModal && (
        <div className="confirm-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="confirm-modal create-project-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-modal-title">创建项目</h3>

            <div className="field-group" style={{ marginBottom: '12px' }}>
              <label>项目名称</label>
              <div className="input-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"></path>
                </svg>
                <input
                  type="text"
                  className="config-input"
                  placeholder="输入项目名称"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                  autoFocus
                />
              </div>
            </div>

            <div className="field-group" style={{ marginBottom: '12px' }}>
              <label>项目描述</label>
              <div className="input-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <input
                  type="text"
                  className="config-input"
                  placeholder="简要描述项目内容（可选）"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                />
              </div>
            </div>

            <div className="field-group" style={{ marginBottom: '12px' }}>
              <label>视频比例</label>
              <div className="ratio-options">
                {['16:9', '9:16', '1:1', '4:3'].map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    className={`ratio-btn ${newProjectRatio === ratio ? 'selected' : ''}`}
                    onClick={() => setNewProjectRatio(ratio)}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group" style={{ marginBottom: '16px' }}>
              <label>视频风格</label>
              <div className="input-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
                </svg>
                <input
                  type="text"
                  className="config-input"
                  placeholder="如：纪录片、电影风、短视频（可选）"
                  value={newProjectStyle}
                  onChange={(e) => setNewProjectStyle(e.target.value)}
                />
              </div>
            </div>

            <div className="confirm-modal-actions">
              <button className="confirm-modal-btn cancel" onClick={() => { setShowCreateModal(false); resetForm() }}>
                取消
              </button>
              <button
                className="confirm-modal-btn confirm"
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || creating}
              >
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== Project Detail View ====================

interface ProjectDetailViewProps {
  projectId: string
}

function ProjectDetailView({ projectId }: ProjectDetailViewProps) {
  const navigate = useNavigate()
  const { success: showSuccess, error: showError } = useNotification()
  const [project, setProject] = useState<ProjectInfoData | null>(null)
  const [canvases, setCanvases] = useState<CanvasInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; canvas: CanvasInfo | null }>({ show: false, canvas: null })
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    video_ratio: '16:9',
    video_style: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadProjectAndCanvases()
  }, [projectId])

  const loadProjectAndCanvases = async () => {
    try {
      setLoading(true)
      // Load project info
      const projects = await getProjects()
      const found = projects.find(p => p.id === projectId)
      if (found) {
        setProject(found)
        setEditForm({
          name: found.name,
          description: found.description || '',
          video_ratio: found.video_ratio || '16:9',
          video_style: found.video_style || '',
        })
      }
      // Load canvases
      const data = await getCanvasesByProject(projectId)
      setCanvases(data)
      // Load preview URLs
      const urls: Record<string, string> = {}
      for (const canvas of data) {
        if (canvas.preview) {
          try {
            const paths = JSON.parse(canvas.preview) as string[]
            if (paths.length > 0 && paths[0].startsWith('assets/')) {
              const fileUrl = await getFileUrl(paths[0])
              urls[canvas.id] = fileUrl
            }
          } catch (err) {
            console.error('[Projects] Failed to load preview for:', canvas.name, err)
          }
        }
      }
      setPreviewUrls(urls)
    } catch (err) {
      console.error('Failed to load project:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!project || !editForm.name.trim() || saving) return
    try {
      setSaving(true)
      const updated: ProjectInfoData = {
        ...project,
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        video_ratio: editForm.video_ratio,
        video_style: editForm.video_style.trim() || null,
        updated_at: new Date().toISOString(),
      }
      await saveProjectMeta(updated)
      setProject(updated)
      setIsEditing(false)
      showSuccess('项目信息已保存')
    } catch (err) {
      console.error('Failed to save project:', err)
      showError('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    if (project) {
      setEditForm({
        name: project.name,
        description: project.description || '',
        video_ratio: project.video_ratio || '16:9',
        video_style: project.video_style || '',
      })
    }
    setIsEditing(false)
  }

  const handleCanvasClick = (canvas: CanvasInfo) => {
    navigate(`/canvas?id=${canvas.id}`)
  }

  const handleDeleteCanvas = async () => {
    if (!deleteModal.canvas) return
    try {
      await deleteCanvasById(deleteModal.canvas.id)
      setCanvases(prev => prev.filter(c => c.id !== deleteModal.canvas!.id))
      setDeleteModal({ show: false, canvas: null })
    } catch (err) {
      console.error('Failed to delete canvas:', err)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).replace(/\//g, '/')
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return (
      <div className="page-content">
        <p>加载中...</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="page-content">
        <p>项目不存在</p>
      </div>
    )
  }

  return (
    <div className="home-content">
      {/* 项目信息栏 */}
      <div className="project-info-bar">
        <div className="project-info-header">
          <button className="back-btn" onClick={() => navigate('/projects')}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"></path>
            </svg>
          </button>
          {isEditing ? (
            <input
              type="text"
              className="project-name-input"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              autoFocus
            />
          ) : (
            <h2 className="project-name">{project.name}</h2>
          )}
          {!isEditing ? (
            <button className="edit-btn" onClick={() => setIsEditing(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3 15v4h4l6.174-2.812Z"></path>
                <path d="m15 5 4 4"></path>
              </svg>
              编辑
            </button>
          ) : (
            <div className="edit-actions">
              <button className="edit-btn cancel" onClick={handleCancelEdit}>取消</button>
              <button
                className="edit-btn save"
                onClick={handleSaveEdit}
                disabled={!editForm.name.trim() || saving}
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="project-info-edit">
            <div className="field-group">
              <label>项目描述</label>
              <input
                type="text"
                className="info-input"
                placeholder="简要描述项目内容（可选）"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div className="field-group">
              <label>视频比例</label>
              <div className="ratio-options">
                {['16:9', '9:16', '1:1', '4:3'].map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    className={`ratio-btn ${editForm.video_ratio === ratio ? 'selected' : ''}`}
                    onClick={() => setEditForm({ ...editForm, video_ratio: ratio })}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
            <div className="field-group">
              <label>视频风格</label>
              <input
                type="text"
                className="info-input"
                placeholder="如：纪录片、电影风、短视频（可选）"
                value={editForm.video_style}
                onChange={(e) => setEditForm({ ...editForm, video_style: e.target.value })}
              />
            </div>
          </div>
        ) : (
          <div className="project-info-display">
            {project.description && (
              <div className="info-item">
                <span className="info-label">描述</span>
                <span className="info-value">{project.description}</span>
              </div>
            )}
            <div className="info-item">
              <span className="info-label">视频比例</span>
              <span className="info-value badge">{project.video_ratio || '16:9'}</span>
            </div>
            {project.video_style && (
              <div className="info-item">
                <span className="info-label">视频风格</span>
                <span className="info-value">{project.video_style}</span>
              </div>
            )}
            <div className="info-item">
              <span className="info-label">更新时间</span>
              <span className="info-value">{formatDate(project.updated_at)}</span>
            </div>
          </div>
        )}
      </div>

      {/* 画布列表 */}
      <div className="recent-section">
        <div className="section-header">
          <div className="section-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-panels-top-left" aria-hidden="true">
              <rect width="18" height="18" x="3" y="3" rx="2"></rect>
              <path d="M3 9h18"></path>
              <path d="M9 21V9"></path>
            </svg>
            <span>画布 ({canvases.length})</span>
          </div>
        </div>
        <div className="cards-grid">
          {/* 创建新画布卡片 */}
          <div className="card card-create" onClick={() => navigate('/canvas')}>
            <div className="card-create-inner">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F7F7F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus" aria-hidden="true">
                <path d="M5 12h14"></path>
                <path d="M12 5v14"></path>
              </svg>
              <span>新建画布</span>
            </div>
          </div>
          {/* 画布卡片 */}
          {canvases.map((canvas) => (
            <div key={canvas.id} className="card" onClick={() => handleCanvasClick(canvas)}>
              <div className="card-thumbnail">
                {canvas.preview && previewUrls[canvas.id] ? (
                  <img src={previewUrls[canvas.id]} alt={canvas.name} className="card-image" draggable="false" />
                ) : canvas.thumbnail ? (
                  <img src={canvas.thumbnail} alt={canvas.name} className="card-image" draggable="false" />
                ) : (
                  <div className="card-thumbnail-placeholder">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                      <path d="M3 9h18"></path>
                      <path d="M9 21V9"></path>
                    </svg>
                  </div>
                )}
              </div>
              <div className="card-info">
                <div className="card-title-row">
                  <p className="card-title">{canvas.name}</p>
                  <button
                    className="card-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteModal({ show: true, canvas })
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
                <p className="card-date">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 6v6l4 2"></path>
                  </svg>
                  <span>{formatDate(canvas.updated_at)}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 删除确认弹窗 */}
      {deleteModal.show && (
        <div className="confirm-modal-overlay" onClick={() => setDeleteModal({ show: false, canvas: null })}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-modal-title">确认删除</h3>
            <p className="confirm-modal-message">
              确定要删除画布 "{deleteModal.canvas?.name}" 吗？此操作无法撤销。
            </p>
            <div className="confirm-modal-actions">
              <button className="confirm-modal-btn cancel" onClick={() => setDeleteModal({ show: false, canvas: null })}>
                取消
              </button>
              <button className="confirm-modal-btn confirm" onClick={handleDeleteCanvas}>
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== Main Projects Page ====================

export default function Projects() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const projectId = searchParams.get('id')

  const handleProjectClick = (project: ProjectInfoData) => {
    navigate(`/projects?id=${project.id}&name=${encodeURIComponent(project.name)}`)
  }

  // If projectId is provided, show project detail view
  if (projectId) {
    return (
      <div className="page-container">
        <HeaderBar />
        <ProjectDetailView projectId={projectId} />
      </div>
    )
  }

  // Otherwise show project list
  return (
    <div className="page-container">
      <HeaderBar />
      <ProjectListView onProjectClick={handleProjectClick} />
    </div>
  )
}
