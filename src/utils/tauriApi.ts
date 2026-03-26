import { invoke, isTauri } from '@tauri-apps/api/core'

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

// Re-export isTauri for convenience
export { isTauri }

// Get app info from Rust backend
export async function getAppInfo(): Promise<ProjectInfo> {
  return await invoke<ProjectInfo>('get_app_info')
}

// Save project data
export async function saveProject(name: string, data: string): Promise<SaveResult> {
  return await invoke<SaveResult>('save_project', { name, data })
}

// Load project data
export async function loadProject(name: string): Promise<string> {
  return await invoke<string>('load_project', { name })
}

// List all saved projects
export async function listProjects(): Promise<string[]> {
  return await invoke<string[]>('list_projects')
}

// Delete a project
export async function deleteProject(name: string): Promise<string> {
  return await invoke<string>('delete_project', { name })
}

// ==================== Settings API ====================

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

// Get all LLM configs from database
export async function getLlmConfigs(): Promise<LlmConfig[]> {
  return await invoke<LlmConfig[]>('get_llm_configs')
}

// Save or update an LLM config
export async function saveLlmConfig(config: LlmConfig): Promise<LlmConfig> {
  return await invoke<LlmConfig>('save_llm_config', { config })
}

// Delete an LLM config
export async function deleteLlmConfig(id: string): Promise<string> {
  return await invoke<string>('delete_llm_config', { id })
}

// Get all ComfyUI configs from database
export async function getComfyuiConfigs(): Promise<ComfyuiConfig[]> {
  return await invoke<ComfyuiConfig[]>('get_comfyui_configs')
}

// Save or update a ComfyUI config
export async function saveComfyuiConfig(config: ComfyuiConfig): Promise<ComfyuiConfig> {
  return await invoke<ComfyuiConfig>('save_comfyui_config', { config })
}

// Delete a ComfyUI config
export async function deleteComfyuiConfig(id: string): Promise<string> {
  return await invoke<string>('delete_comfyui_config', { id })
}

// Test LLM connection
export async function testLlmConnection(config: LlmConfig): Promise<string> {
  return await invoke<string>('test_llm_connection', { config })
}

// Test ComfyUI connection
export async function testComfyuiConnection(config: ComfyuiConfig): Promise<string> {
  return await invoke<string>('test_comfyui_connection', { config })
}
