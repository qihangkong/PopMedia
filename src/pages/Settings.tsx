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
  testLlmConnection,
  testComfyuiConnection,
} from '../utils/tauriApi'
import { invalidateLlmConfigCache } from '../utils/chatApi'
import {
  BrainIcon,
  SettingsIcon as SettingsIconAlias,
  TrashIcon,
  GlobeIcon,
  KeyIcon,
  CpuIcon,
  ServerIcon,
} from '../icons'

type ConnectionStatus = 'untested' | 'testing' | 'success' | 'failed'

interface LlmConfigWithStatus extends LlmConfig {
  connectionStatus: ConnectionStatus
  connectionMessage?: string
}

interface ComfyuiConfigWithStatus extends ComfyuiConfig {
  connectionStatus: ConnectionStatus
  connectionMessage?: string
}


export default function Settings() {
  const [llmConfigs, setLlmConfigs] = useState<LlmConfigWithStatus[]>([])
  const [comfyuiConfigs, setComfyuiConfigs] = useState<ComfyuiConfigWithStatus[]>([])
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
      setLlmConfigs(llms.map(config => ({ ...config, connectionStatus: 'untested' as ConnectionStatus })))
      setComfyuiConfigs(comfyuis.map(config => ({ ...config, connectionStatus: 'untested' as ConnectionStatus })))
    } catch (error) {
      console.error('Failed to load configs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddLLM = async () => {
    const newConfig: LlmConfigWithStatus = {
      id: crypto.randomUUID(),
      name: '新的大语言模型',
      api_url: '',
      api_key: '',
      model_name: '',
      connectionStatus: 'untested',
    }
    try {
      await saveLlmConfig(newConfig)
      setLlmConfigs(prev => [...prev, newConfig])
      setEditingId(newConfig.id)
      invalidateLlmConfigCache()
    } catch (error) {
      console.error('Failed to add LLM config:', error)
    }
  }

  const handleAddComfyUI = async () => {
    const newConfig: ComfyuiConfigWithStatus = {
      id: crypto.randomUUID(),
      name: '新的ComfyUI配置',
      host: '127.0.0.1',
      port: '8188',
      connectionStatus: 'untested',
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
      setLlmConfigs(prev => prev.filter(config => config.id !== id))
    } catch (error) {
      console.error('Failed to delete LLM config:', error)
    }
  }

  const handleDeleteComfyUI = async (id: string) => {
    try {
      await deleteComfyuiConfig(id)
      setComfyuiConfigs(prev => prev.filter(config => config.id !== id))
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

    const updatedConfig = { ...config, [field]: value, connectionStatus: 'untested' as ConnectionStatus }
    setLlmConfigs(prev => prev.map(c => c.id === id ? updatedConfig : c))

    try {
      await saveLlmConfig(updatedConfig)
      invalidateLlmConfigCache()
    } catch (error) {
      console.error('Failed to save LLM config:', error)
    }
  }

  const handleUpdateComfyUI = async (id: string, field: keyof ComfyuiConfig, value: string) => {
    const config = comfyuiConfigs.find(c => c.id === id)
    if (!config) return

    const updatedConfig = { ...config, [field]: value, connectionStatus: 'untested' as ConnectionStatus }
    setComfyuiConfigs(prev => prev.map(c => c.id === id ? updatedConfig : c))

    try {
      await saveComfyuiConfig(updatedConfig)
    } catch (error) {
      console.error('Failed to save ComfyUI config:', error)
    }
  }

  const handleTestConnection = async (type: 'llm' | 'comfyui', id: string) => {
    if (type === 'llm') {
      const config = llmConfigs.find(c => c.id === id)
      if (!config) return

      // Update status to testing - use functional update to avoid stale state
      setLlmConfigs(prev => prev.map(c =>
        c.id === id ? { ...c, connectionStatus: 'testing' as ConnectionStatus, connectionMessage: undefined } : c
      ))

      try {
        const result = await testLlmConnection(config)
        setLlmConfigs(prev => prev.map(c =>
          c.id === id ? { ...c, connectionStatus: 'success' as ConnectionStatus, connectionMessage: result } : c
        ))
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        setLlmConfigs(prev => prev.map(c =>
          c.id === id ? { ...c, connectionStatus: 'failed' as ConnectionStatus, connectionMessage: errorMessage } : c
        ))
      }
    } else {
      const config = comfyuiConfigs.find(c => c.id === id)
      if (!config) return

      // Update status to testing - use functional update to avoid stale state
      setComfyuiConfigs(prev => prev.map(c =>
        c.id === id ? { ...c, connectionStatus: 'testing' as ConnectionStatus, connectionMessage: undefined } : c
      ))

      try {
        const result = await testComfyuiConnection(config)
        setComfyuiConfigs(prev => prev.map(c =>
          c.id === id ? { ...c, connectionStatus: 'success' as ConnectionStatus, connectionMessage: result } : c
        ))
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        setComfyuiConfigs(prev => prev.map(c =>
          c.id === id ? { ...c, connectionStatus: 'failed' as ConnectionStatus, connectionMessage: errorMessage } : c
        ))
      }
    }
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
                          className={`test-connection-btn ${config.connectionStatus}`}
                          onClick={() => handleTestConnection('llm', config.id)}
                          disabled={config.connectionStatus === 'testing'}
                        >
                          <span className={`status-indicator ${config.connectionStatus}`}></span>
                          {config.connectionStatus === 'testing' ? '测试中...' : config.connectionStatus === 'success' ? '连接成功' : config.connectionStatus === 'failed' ? '连接失败' : '连接测试'}
                        </button>
                        <button
                          className="edit-action-btn"
                          onClick={() => handleEditLLM(config.id)}
                        >
                          <SettingsIconAlias />
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
                          className={`test-connection-btn ${config.connectionStatus}`}
                          onClick={() => handleTestConnection('comfyui', config.id)}
                          disabled={config.connectionStatus === 'testing'}
                        >
                          <span className={`status-indicator ${config.connectionStatus}`}></span>
                          {config.connectionStatus === 'testing' ? '测试中...' : config.connectionStatus === 'success' ? '连接成功' : config.connectionStatus === 'failed' ? '连接失败' : '连接测试'}
                        </button>
                        <button
                          className="edit-action-btn"
                          onClick={() => handleEditComfyUI(config.id)}
                        >
                          <SettingsIconAlias />
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
