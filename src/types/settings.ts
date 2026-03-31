// ==================== API Configuration Types ====================
// These types mirror the Rust backend models in src-tauri/src/models.rs

/// LLM Provider type - determines API endpoint and request format
export type LlmProviderType =
  | 'openai'
  | 'volcengine'
  | 'baidu'
  | 'alibaba'
  | 'zhipu'
  | 'minimax'
  | 'volcengine_coding'
  | 'alibaba_coding'
  | 'custom'

export interface LlmConfig {
  id: string
  name: string
  provider_type: LlmProviderType
  api_url: string
  api_key: string
  model_name: string
}

/// Provider display info for UI
export interface ProviderInfo {
  type: LlmProviderType
  name: string
  description: string
  isCoding: boolean
}

export const LLM_PROVIDERS: ProviderInfo[] = [
  { type: 'alibaba', name: '阿里', description: '通义千问', isCoding: false },
  { type: 'baidu', name: '百度', description: '文心一言', isCoding: false },
  { type: 'minimax', name: 'MiniMax', description: '海螺问问', isCoding: false },
  { type: 'openai', name: 'OpenAI', description: 'GPT 系列', isCoding: false },
  { type: 'volcengine', name: '火山引擎', description: '扣子/Coze (kimi, 等)', isCoding: false },
  { type: 'zhipu', name: '智谱 AI', description: 'GLM-4', isCoding: false },
  { type: 'custom', name: '自定义', description: '手动填写 API URL', isCoding: false },
]

export interface ComfyuiConfig {
  id: string
  name: string
  host: string
  port: string
}

export interface TestConnectionResult {
  logs: string[]
  success: boolean
  message: string
}

export interface ProjectInfo {
  name: string
  version: string
  app_data_dir: string
}

export interface SaveResult {
  success: boolean
  path: string
  message: string
}

export interface ProjectInfoData {
  id: string
  name: string
  thumbnail: string | null
  created_at: string
  updated_at: string
}

export interface CanvasInfo {
  id: string
  name: string
  thumbnail: string | null
  preview: string | null
  project_id: string | null
  created_at: string
  updated_at: string
}

export interface CanvasData {
  nodes: unknown[]
  edges: unknown[]
  viewport?: unknown
}

export interface SkillInfo {
  id: string
  name: string
  description: string
  body: string
  needs_upstream: boolean
}

export interface SkillMeta {
  id: string
  name: string
  description: string
}

export interface SkillReference {
  name: string
  content: string
}