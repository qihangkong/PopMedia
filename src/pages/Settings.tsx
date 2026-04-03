import { useState, useEffect } from 'react'
import HeaderBar from '../components/HeaderBar'
import TestLogModal from '../components/TestLogModal'
import CustomSelect from '../components/CustomSelect'
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
  getSkills,
  getSkill,
  saveSkill,
  deleteSkill,
  readSkillRaw,
  type SkillInfo,
  LLM_PROVIDERS,
} from '../utils/tauriApi'
import { invalidateLlmConfigCache } from '../utils/chatApi'
import { skillRegistry } from '../services/SkillRegistry'
import { useNotification } from '../contexts/NotificationContext'
import {
  BrainIcon,
  SettingsIcon as SettingsIconAlias,
  TrashIcon,
  GlobeIcon,
  KeyIcon,
  CpuIcon,
  ServerIcon,
  SkillIcon,
} from '../icons'
import type { LlmProviderType } from '../types/settings'

type ConnectionStatus = 'untested' | 'testing' | 'success' | 'failed'

interface LlmConfigWithStatus extends LlmConfig {
  connectionStatus: ConnectionStatus
  connectionMessage?: string
}

interface ComfyuiConfigWithStatus extends ComfyuiConfig {
  connectionStatus: ConnectionStatus
  connectionMessage?: string
}

type TabType = 'api' | 'comfyui' | 'skills'

export default function Settings() {
  const { error: notifyError, success: notifySuccess } = useNotification()
  const [activeTab, setActiveTab] = useState<TabType>('api')
  const [llmConfigs, setLlmConfigs] = useState<LlmConfigWithStatus[]>([])
  const [comfyuiConfigs, setComfyuiConfigs] = useState<ComfyuiConfigWithStatus[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Skill states
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  const [skillRawContents, setSkillRawContents] = useState<Map<string, string>>(new Map())

  // Test log modal state
  const [testLogModal, setTestLogModal] = useState<{
    isOpen: boolean
    title: string
    logs: string[]
    status: 'pending' | 'success' | 'failed'
  }>({
    isOpen: false,
    title: '',
    logs: [],
    status: 'pending'
  })

  // Load configs from database on mount
  useEffect(() => {
    loadConfigs()
    loadSkills()
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
    } catch {
      notifyError('加载配置失败')
    } finally {
      setLoading(false)
    }
  }

  const loadSkills = async () => {
    try {
      const skillList = await getSkills()
      const skillInfos = await Promise.all(
        skillList.map(async (s) => {
          try {
            return await getSkill(s.id)
          } catch {
            return null
          }
        })
      )
      setSkills(skillInfos.filter((s): s is SkillInfo => s !== null))
    } catch {
      notifyError('加载 skills 失败')
    }
  }

  const handleAddLLM = async () => {
    const newConfig: LlmConfigWithStatus = {
      id: crypto.randomUUID(),
      name: '新的大语言模型',
      provider_type: 'openai',
      api_url: 'https://api.openai.com/v1',
      api_key: '',
      model_name: '',
      connectionStatus: 'untested',
    }
    try {
      await saveLlmConfig(newConfig)
      setLlmConfigs(prev => [...prev, newConfig])
      setEditingId(newConfig.id)
      invalidateLlmConfigCache()
    } catch {
      notifyError('添加 LLM 配置失败')
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
    } catch {
      notifyError('添加 ComfyUI 配置失败')
    }
  }

  const handleDeleteLLM = async (id: string) => {
    try {
      await deleteLlmConfig(id)
      setLlmConfigs(prev => prev.filter(config => config.id !== id))
    } catch {
      notifyError('删除 LLM 配置失败')
    }
  }

  const handleDeleteComfyUI = async (id: string) => {
    try {
      await deleteComfyuiConfig(id)
      setComfyuiConfigs(prev => prev.filter(config => config.id !== id))
    } catch {
      notifyError('删除 ComfyUI 配置失败')
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

    console.log('handleUpdateLLM:', { id, field, value, config })
    const updatedConfig = { ...config, [field]: value, connectionStatus: 'untested' as ConnectionStatus }
    console.log('updatedConfig:', updatedConfig)
    setLlmConfigs(prev => prev.map(c => c.id === id ? updatedConfig : c))

    try {
      const result = await saveLlmConfig(updatedConfig)
      console.log('save result:', result)
      invalidateLlmConfigCache()
    } catch {
      notifyError('保存 LLM 配置失败')
    }
  }

  const handleUpdateComfyUI = async (id: string, field: keyof ComfyuiConfig, value: string) => {
    const config = comfyuiConfigs.find(c => c.id === id)
    if (!config) return

    const updatedConfig = { ...config, [field]: value, connectionStatus: 'untested' as ConnectionStatus }
    setComfyuiConfigs(prev => prev.map(c => c.id === id ? updatedConfig : c))

    try {
      await saveComfyuiConfig(updatedConfig)
    } catch {
      notifyError('保存 ComfyUI 配置失败')
    }
  }

  const handleTestConnection = async (type: 'llm' | 'comfyui', id: string) => {
    if (type === 'llm') {
      const config = llmConfigs.find(c => c.id === id)
      if (!config) return

      // Open modal with initial log
      setTestLogModal({
        isOpen: true,
        title: `测试 ${config.name}`,
        logs: [`开始测试连接...`, `配置: ${config.api_url}`],
        status: 'pending'
      })

      setLlmConfigs(prev => prev.map(c =>
        c.id === id ? { ...c, connectionStatus: 'testing' as ConnectionStatus, connectionMessage: undefined } : c
      ))

      try {
        const result = await testLlmConnection(config)
        setTestLogModal(prev => ({
          ...prev,
          logs: result.logs,
          status: result.success ? 'success' : 'failed'
        }))
        setLlmConfigs(prev => prev.map(c =>
          c.id === id ? { ...c, connectionStatus: result.success ? 'success' as ConnectionStatus : 'failed' as ConnectionStatus, connectionMessage: result.message } : c
        ))
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        setTestLogModal(prev => ({
          ...prev,
          logs: [...prev.logs, `连接失败!`, `错误: ${errorMessage}`],
          status: 'failed'
        }))
        setLlmConfigs(prev => prev.map(c =>
          c.id === id ? { ...c, connectionStatus: 'failed' as ConnectionStatus, connectionMessage: errorMessage } : c
        ))
      }
    } else {
      const config = comfyuiConfigs.find(c => c.id === id)
      if (!config) return

      setTestLogModal({
        isOpen: true,
        title: `测试 ${config.name}`,
        logs: [`开始测试连接...`, `配置: ${config.host}:${config.port}`],
        status: 'pending'
      })

      setComfyuiConfigs(prev => prev.map(c =>
        c.id === id ? { ...c, connectionStatus: 'testing' as ConnectionStatus, connectionMessage: undefined } : c
      ))

      try {
        const result = await testComfyuiConnection(config)
        setTestLogModal(prev => ({
          ...prev,
          logs: result.logs,
          status: result.success ? 'success' : 'failed'
        }))
        setComfyuiConfigs(prev => prev.map(c =>
          c.id === id ? { ...c, connectionStatus: result.success ? 'success' as ConnectionStatus : 'failed' as ConnectionStatus, connectionMessage: result.message } : c
        ))
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        setTestLogModal(prev => ({
          ...prev,
          logs: [...prev.logs, `连接失败!`, `错误: ${errorMessage}`],
          status: 'failed'
        }))
        setComfyuiConfigs(prev => prev.map(c =>
          c.id === id ? { ...c, connectionStatus: 'failed' as ConnectionStatus, connectionMessage: errorMessage } : c
        ))
      }
    }
  }

  // Skill handlers
  const handleAddSkill = async () => {
    const name = prompt('输入 Skill 名称：')
    if (!name || !name.trim()) return

    const id = name.toLowerCase().replace(/\s+/g, '-')
    const defaultContent = `---
name: ${id}
description: ${name}
---

# ${name}

输入你的 skill 指令...`

    try {
      await saveSkill(id, defaultContent)
      await loadSkills()
      setSelectedSkillId(id)
      notifySuccess('Skill 创建成功')
    } catch {
      notifyError('创建 Skill 失败')
    }
  }

  const handleDeleteSkill = async (id: string) => {
    try {
      await deleteSkill(id)
      setSkills(prev => prev.filter(s => s.id !== id))
      await skillRegistry.reload()
      notifySuccess('Skill 删除成功')
    } catch {
      notifyError('删除 Skill 失败')
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
        {/* Tab Navigation */}
        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'api' ? 'active' : ''}`}
            onClick={() => setActiveTab('api')}
          >
            <SettingsIconAlias />
            API 设置
          </button>
          <button
            className={`settings-tab ${activeTab === 'comfyui' ? 'active' : ''}`}
            onClick={() => setActiveTab('comfyui')}
          >
            <ServerIcon />
            ComfyUI 设置
          </button>
          <button
            className={`settings-tab ${activeTab === 'skills' ? 'active' : ''}`}
            onClick={() => setActiveTab('skills')}
          >
            <SkillIcon />
            SKILL 设置
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'api' && (
            <>
              {/* Add LLM button */}
              <div className="settings-buttons">
                <button className="settings-add-btn" onClick={handleAddLLM}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"></path>
                    <path d="M12 5v14"></path>
                  </svg>
                  添加大语言模型
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
                              <label>厂商</label>
                              <div className="input-wrapper">
                                <GlobeIcon />
                                <CustomSelect
                                  value={config.provider_type}
                                  options={LLM_PROVIDERS.map(p => ({
                                    value: p.type,
                                    label: p.name,
                                    description: p.description,
                                    isCoding: p.isCoding,
                                  }))}
                                  onChange={async (value) => {
                                    const provider = LLM_PROVIDERS.find(p => p.type === value)
                                    if (provider) {
                                      const defaultUrl = provider.type === 'custom' ? '' : provider.type === 'volcengine'
                                        ? 'https://ark.cn-beijing.volces.com/api/paas/v1'
                                        : provider.type === 'volcengine_coding'
                                        ? 'https://ark.cn-beijing.volces.com/api/coding'
                                        : provider.type.startsWith('alibaba')
                                        ? 'https://dashscope.aliyuncs.com/api/v1'
                                        : provider.type === 'baidu'
                                        ? 'https://qianfan.baidubce.com/v2'
                                        : provider.type === 'zhipu'
                                        ? 'https://open.bigmodel.cn/api/paas/v4'
                                        : provider.type === 'minimax'
                                        ? 'https://api.minimax.chat/v1'
                                        : provider.type === 'openai'
                                        ? 'https://api.openai.com/v1'
                                        : ''
                                      const updatedConfig = {
                                        ...config,
                                        provider_type: value as LlmProviderType,
                                        api_url: defaultUrl,
                                        connectionStatus: 'untested' as ConnectionStatus,
                                      }
                                      setLlmConfigs(prev => prev.map(c => c.id === config.id ? updatedConfig : c))
                                      try {
                                        await saveLlmConfig(updatedConfig)
                                        invalidateLlmConfigCache()
                                      } catch {
                                        notifyError('保存 LLM 配置失败')
                                      }
                                    }
                                  }}
                                  disabled={editingId !== config.id}
                                />
                              </div>
                            </div>
                            {config.provider_type === 'custom' && (
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
                            )}
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
                                  placeholder={config.provider_type.includes('coding') ? '如: kimi-coder-8k' : '如: kimi-2.5-flash'}
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

              {/* Empty state */}
              {llmConfigs.length === 0 && (
                <div className="settings-empty">
                  <p>点击上方按钮添加配置</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'comfyui' && (
            <>
              {/* Add ComfyUI button */}
              <div className="settings-buttons">
                <button className="settings-add-btn" onClick={handleAddComfyUI}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"></path>
                    <path d="M12 5v14"></path>
                  </svg>
                  添加ComfyUI配置
                </button>
              </div>

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
              {comfyuiConfigs.length === 0 && (
                <div className="settings-empty">
                  <p>点击上方按钮添加配置</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'skills' && (
            <>
              {/* Skills list - two column layout */}
              <div className="settings-section-group">
                <div className="settings-section-title">
                  <SkillIcon />
                  <span>Skills</span>
                </div>
                <div className="skills-two-column">
                  {/* Left column: skill list */}
                  <div className="skills-list">
                    {skills.length === 0 && (
                      <div className="skills-list-empty">
                        <p>暂无 Skills</p>
                      </div>
                    )}
                    {skills.map(skill => (
                      <div
                        key={skill.id}
                        className={`skill-list-item ${selectedSkillId === skill.id ? 'selected' : ''}`}
                        onClick={async () => {
                          setSelectedSkillId(skill.id)
                          // Load raw content when selected
                          if (!skillRawContents.has(skill.id)) {
                            try {
                              const raw = await readSkillRaw(skill.id)
                              setSkillRawContents(prev => new Map(prev).set(skill.id, raw))
                            } catch (e) {
                              console.error('Failed to load skill raw content:', e)
                            }
                          }
                        }}
                      >
                        <span className="skill-list-name">{skill.name}</span>
                        <button
                          className="delete-model-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteSkill(skill.id)
                          }}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Right column: skill content */}
                  <div className="skills-detail">
                    {selectedSkillId ? (
                      (() => {
                        const skill = skills.find(s => s.id === selectedSkillId)
                        return skill ? (
                          <div className="skill-detail-content">
                            <div className="skill-detail-body">
                              <pre className="skill-raw-content">{skillRawContents.get(selectedSkillId) ?? ''}</pre>
                            </div>
                          </div>
                        ) : null
                      })()
                    ) : (
                      <div className="skills-detail-empty">
                        <p>选择左侧一个 Skill 查看详情</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Add skill button */}
              <button
                className="settings-add-btn"
                onClick={handleAddSkill}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"></path>
                  <path d="M12 5v14"></path>
                </svg>
                添加 Skill
              </button>
            </>
          )}
        </div>
      </div>

      {/* Test Log Modal */}
      <TestLogModal
        isOpen={testLogModal.isOpen}
        onClose={() => setTestLogModal(prev => ({ ...prev, isOpen: false }))}
        title={testLogModal.title}
        logs={testLogModal.logs}
        status={testLogModal.status}
      />
    </div>
  )
}
