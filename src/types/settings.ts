// ==================== API Configuration Types ====================
// These types mirror the Rust backend models in src-tauri/src/models.rs

export interface LlmConfig {
  id: string
  name: string
  api_url: string
  api_key: string
  model_name: string
}

export interface ComfyuiConfig {
  id: string
  name: string
  host: string
  port: string
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