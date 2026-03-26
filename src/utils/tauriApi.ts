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
