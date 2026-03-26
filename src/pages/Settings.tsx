import { useState, useEffect } from 'react'
import HeaderBar from '../components/HeaderBar'
import {
  LlmConfig,
  ComfyuiConfig,
  getLlmConfigs,
  saveLlmConfig,
  deleteLlmConfig,
  getComfyuiConfigs,
  saveComfyuiConfig,
  deleteComfyuiConfig,
} from '../utils/tauriApi'

// Brain icon for LLM section
const BrainIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 18V5"></path>
    <path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4"></path>
    <path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5"></path>
    <path d="M17.997 5.125a4 4 0 0 1 2.526 5.77"></path>
    <path d="M18 18a4 4 0 0 0 2-7.464"></path>
    <path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517"></path>
    <path d="M6 18a4 4 0 0 1-2-7.464"></path>
    <path d="M6.003 5.125a4 4 0 0 0-2.526 5.77"></path>
  </svg>
)

// Settings icon for edit button
const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
)

// Trash icon for delete button
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 11v6"></path>
    <path d="M14 11v6"></path>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
    <path d="M3 6h18"></path>
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
)

// Globe icon for API URL
const GlobeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
    <path d="M2 12h20"></path>
  </svg>
)

// Key icon for API Key
const KeyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"></path>
    <path d="m21 2-9.6 9.6"></path>
    <circle cx="7.5" cy="15.5" r="5.5"></circle>
  </svg>
)

// CPU icon for Model Name
const CpuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20v2"></path>
    <path d="M12 2v2"></path>
    <path d="M17 20v2"></path>
    <path d="M17 2v2"></path>
    <path d="M2 12h2"></path>
    <path d="M2 17h2"></path>
    <path d="M2 7h2"></path>
    <path d="M20 12h2"></path>
    <path d="M20 17h2"></path>
    <path d="M20 7h2"></path>
    <path d="M7 20v2"></path>
    <path d="M7 2v2"></path>
    <rect x="4" y="4" width="16" height="16" rx="2"></rect>
    <rect x="8" y="8" width="8" height="8" rx="1"></rect>
  </svg>
)

// Server icon for ComfyUI host
const ServerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="8" x="2" y="2" rx="2" ry="2"></rect>
    <rect width="20" height="8" x="2" y="14" rx="2" ry="2"></rect>
    <line x1="6" x2="6.01" y1="6" y2="6"></line>
    <line x1="6" x2="6.01" y1="18" y2="18"></line>
  </svg>
)

export default function Settings() {
  const [llmConfigs, setLlmConfigs] = useState<LlmConfig[]>([])
  const [comfyuiConfigs, setComfyuiConfigs] = useState<ComfyuiConfig[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Load configs from database on mount
  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      setLoading(true)
      const [llms, comfyuis] = await Promise.all([
        getLlmConfigs(),
        getComfyuiConfigs(),
      ])
      setLlmConfigs(llms)
      setComfyuiConfigs(comfyuis)
    } catch (error) {
      console.error('Failed to load configs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddLLM = async () => {
    const newConfig: LlmConfig = {
      id: crypto.randomUUID(),
      name: '新的大语言模型',
      api_url: '',
      api_key: '',
      model_name: '',
    }
    try {
      await saveLlmConfig(newConfig)
      setLlmConfigs([...llmConfigs, newConfig])
      setEditingId(newConfig.id)
    } catch (error) {
      console.error('Failed to add LLM config:', error)
    }
  }

  const handleAddComfyUI = async () => {
    const newConfig: ComfyuiConfig = {
      id: crypto.randomUUID(),
      name: '新的ComfyUI配置',
      host: '127.0.0.1',
      port: '8188',
    }
    try {
      await saveComfyuiConfig(newConfig)
      setComfyuiConfigs([...comfyuiConfigs, newConfig])
      setEditingId(newConfig.id)
    } catch (error) {
      console.error('Failed to add ComfyUI config:', error)
    }
  }

  const handleDeleteLLM = async (id: string) => {
    try {
      await deleteLlmConfig(id)
      setLlmConfigs(llmConfigs.filter(config => config.id !== id))
    } catch (error) {
      console.error('Failed to delete LLM config:', error)
    }
  }

  const handleDeleteComfyUI = async (id: string) => {
    try {
      await deleteComfyuiConfig(id)
      setComfyuiConfigs(comfyuiConfigs.filter(config => config.id !== id))
    } catch (error) {
      console.error('Failed to delete ComfyUI config:', error)
    }
  }

  const handleEditLLM = (id: string) => {
    setEditingId(editingId === id ? null : id)
  }

  const handleEditComfyUI = (id: string) => {
    setEditingId(editingId === id ? null : id)
  }

  const handleUpdateLLM = async (id: string, field: keyof LlmConfig, value: string) => {
    const config = llmConfigs.find(c => c.id === id)
    if (!config) return

    const updatedConfig = { ...config, [field]: value }
    setLlmConfigs(llmConfigs.map(c => c.id === id ? updatedConfig : c))

    try {
      await saveLlmConfig(updatedConfig)
    } catch (error) {
      console.error('Failed to save LLM config:', error)
    }
  }

  const handleUpdateComfyUI = async (id: string, field: keyof ComfyuiConfig, value: string) => {
    const config = comfyuiConfigs.find(c => c.id === id)
    if (!config) return

    const updatedConfig = { ...config, [field]: value }
    setComfyuiConfigs(comfyuiConfigs.map(c => c.id === id ? updatedConfig : c))

    try {
      await saveComfyuiConfig(updatedConfig)
    } catch (error) {
      console.error('Failed to save ComfyUI config:', error)
    }
  }

  const handleTestConnection = async (type: 'llm' | 'comfyui', id: string) => {
    // Update status to testing
    if (type === 'llm') {
      setLlmConfigs(llmConfigs.map(config =>
        config.id === id ? { ...config } : config
      ))
    } else {
      setComfyuiConfigs(comfyuiConfigs.map(config =>
        config.id === id ? { ...config } : config
      ))
    }

    // Simulate API test
    await new Promise(resolve => setTimeout(resolve, 1500))

    // For now, just show as untested (real API test would go here)
    console.log(`Connection test for ${type} config ${id} completed`)
  }

  if (loading) {
    return (
      <div className="page-container">
        <HeaderBar />
        <div className="settings-page">
          <div className="settings-content">
            <div className="settings-loading">加载中...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <HeaderBar />
      <div className="settings-page">
        <div className="settings-content">
          {/* Add buttons */}
          <div className="settings-buttons">
            <button className="settings-add-btn" onClick={handleAddLLM}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"></path>
                <path d="M12 5v14"></path>
              </svg>
              添加大语言模型
            </button>
            <button className="settings-add-btn" onClick={handleAddComfyUI}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"></path>
                <path d="M12 5v14"></path>
              </svg>
              添加ComfyUI配置
            </button>
          </div>

          {/* LLM Section */}
          {llmConfigs.length > 0 && (
            <div className="settings-section-group">
              <div className="settings-section-title">
                <BrainIcon />
                <span>大语言模型</span>
              </div>
              <div className="settings-section">
                {llmConfigs.map(config => (
                  <div key={config.id} className="model-card">
                    <div className="section-header">
                      <div className="section-icon">
                        <BrainIcon />
                      </div>
                      <input
                        type="text"
                        className="model-name-input"
                        value={config.name}
                        onChange={(e) => handleUpdateLLM(config.id, 'name', e.target.value)}
                        disabled={editingId !== config.id}
                      />
                      <div className="model-card-actions-inline">
                        <button
                          className="test-connection-btn untested"
                          onClick={() => handleTestConnection('llm', config.id)}
                        >
                          <span className="status-indicator untested"></span>
                          连接测试
                        </button>
                        <button
                          className="edit-action-btn"
                          onClick={() => handleEditLLM(config.id)}
                        >
                          <SettingsIcon />
                        </button>
                        <button
                          className="delete-model-btn"
                          onClick={() => handleDeleteLLM(config.id)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                    <div className="config-block">
                      <div className="config-fields">
                        <div className="field-group">
                          <label>API URL</label>
                          <div className="input-wrapper">
                            <GlobeIcon />
                            <input
                              type="text"
                              className="config-input"
                              placeholder="https://api.example.com/v1"
                              value={config.api_url}
                              onChange={(e) => handleUpdateLLM(config.id, 'api_url', e.target.value)}
                              disabled={editingId !== config.id}
                            />
                          </div>
                        </div>
                        <div className="field-group">
                          <label>API Key</label>
                          <div className="input-wrapper">
                            <KeyIcon />
                            <input
                              type="password"
                              className="config-input"
                              placeholder="输入您的 API Key"
                              value={config.api_key}
                              onChange={(e) => handleUpdateLLM(config.id, 'api_key', e.target.value)}
                              disabled={editingId !== config.id}
                            />
                          </div>
                        </div>
                        <div className="field-group">
                          <label>Model Name</label>
                          <div className="input-wrapper">
                            <CpuIcon />
                            <input
                              type="text"
                              className="config-input"
                              placeholder="gpt-4o"
                              value={config.model_name}
                              onChange={(e) => handleUpdateLLM(config.id, 'model_name', e.target.value)}
                              disabled={editingId !== config.id}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ComfyUI Section */}
          {comfyuiConfigs.length > 0 && (
            <div className="settings-section-group">
              <div className="settings-section-title">
                <ServerIcon />
                <span>ComfyUI配置</span>
              </div>
              <div className="settings-section">
                {comfyuiConfigs.map(config => (
                  <div key={config.id} className="model-card">
                    <div className="section-header">
                      <div className="section-icon">
                        <ServerIcon />
                      </div>
                      <input
                        type="text"
                        className="model-name-input"
                        value={config.name}
                        onChange={(e) => handleUpdateComfyUI(config.id, 'name', e.target.value)}
                        disabled={editingId !== config.id}
                      />
                      <div className="model-card-actions-inline">
                        <button
                          className="test-connection-btn untested"
                          onClick={() => handleTestConnection('comfyui', config.id)}
                        >
                          <span className="status-indicator untested"></span>
                          连接测试
                        </button>
                        <button
                          className="edit-action-btn"
                          onClick={() => handleEditComfyUI(config.id)}
                        >
                          <SettingsIcon />
                        </button>
                        <button
                          className="delete-model-btn"
                          onClick={() => handleDeleteComfyUI(config.id)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                    <div className="config-block">
                      <div className="config-fields">
                        <div className="field-group">
                          <label>Host</label>
                          <div className="input-wrapper">
                            <GlobeIcon />
                            <input
                              type="text"
                              className="config-input"
                              placeholder="127.0.0.1"
                              value={config.host}
                              onChange={(e) => handleUpdateComfyUI(config.id, 'host', e.target.value)}
                              disabled={editingId !== config.id}
                            />
                          </div>
                        </div>
                        <div className="field-group">
                          <label>Port</label>
                          <div className="input-wrapper">
                            <CpuIcon />
                            <input
                              type="text"
                              className="config-input"
                              placeholder="8188"
                              value={config.port}
                              onChange={(e) => handleUpdateComfyUI(config.id, 'port', e.target.value)}
                              disabled={editingId !== config.id}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {llmConfigs.length === 0 && comfyuiConfigs.length === 0 && (
            <div className="settings-empty">
              <p>点击上方按钮添加配置</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
