import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import HeaderBar from '../components/HeaderBar'
import { getAllCanvases, getProjects, CanvasInfo, ProjectInfoData } from '../utils/tauriApi'

export default function Home() {
  const navigate = useNavigate()
  const [recentCanvases, setRecentCanvases] = useState<CanvasInfo[]>([])
  const [projects, setProjects] = useState<ProjectInfoData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [canvases, projectsData] = await Promise.all([
        getAllCanvases(),
        getProjects()
      ])
      setRecentCanvases(canvases)
      setProjects(projectsData)
    } catch (err) {
      console.error('Failed to load home data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCanvas = () => {
    navigate('/canvas')
  }

  const handleCanvasClick = (canvas: CanvasInfo) => {
    navigate(`/canvas?id=${canvas.id}`)
  }

  const handleProjectClick = (project: ProjectInfoData) => {
    navigate(`/projects?id=${project.id}`)
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
        second: '2-digit'
      }).replace(/\//g, '/')
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <HeaderBar />
        <div className="page-content">
          <p>加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <HeaderBar />
      <div className="home-content">
        {/* 最近的画布 */}
        <div className="recent-section">
          <div className="section-header">
            <div className="section-title">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-panels-top-left" aria-hidden="true">
                <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                <path d="M3 9h18"></path>
                <path d="M9 21V9"></path>
              </svg>
              <span>最近的画布</span>
            </div>
          </div>
          <div className="cards-grid">
            {/* 创建新画布卡片 */}
            <div className="card card-create" onClick={handleCreateCanvas}>
              <div className="card-create-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F7F7F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus" aria-hidden="true">
                  <path d="M5 12h14"></path>
                  <path d="M12 5v14"></path>
                </svg>
                <span>开始创作</span>
              </div>
            </div>
            {/* 画布卡片 */}
            {recentCanvases.map((canvas) => (
              <div key={canvas.id} className="card" onClick={() => handleCanvasClick(canvas)}>
                <div className="card-thumbnail">
                  {canvas.thumbnail ? (
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
                  <p className="card-title">{canvas.name}</p>
                  <p className="card-project">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-folder-open" aria-hidden="true">
                      <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    <span>{canvas.project_id}</span>
                  </p>
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

        {/* 我的项目 */}
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
            {projects.map((project) => (
              <div key={project.id} className="card" onClick={() => handleProjectClick(project)}>
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
                    <button className="card-menu-btn" onClick={(e) => e.stopPropagation()}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-ellipsis-vertical" aria-hidden="true">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                      </svg>
                    </button>
                  </div>
                  <p className="card-date">{formatDate(project.updated_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}