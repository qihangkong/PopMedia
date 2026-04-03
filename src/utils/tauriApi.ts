import { invoke, isTauri, convertFileSrc } from '@tauri-apps/api/core'

// Import and re-export types from centralized location
import type {
  LlmConfig,
  LlmProviderType,
  ComfyuiConfig,
  ComfyuiWorkflow,
  ProjectInfo,
  SaveResult,
  ProjectInfoData,
  CanvasInfo,
  CanvasData,
  SkillInfo,
  SkillMeta,
  SkillReference,
  TestConnectionResult,
} from '../types/settings'

export type {
  LlmConfig,
  LlmProviderType,
  ComfyuiConfig,
  ComfyuiWorkflow,
  ProjectInfo,
  SaveResult,
  ProjectInfoData,
  CanvasInfo,
  CanvasData,
  SkillInfo,
  SkillMeta,
  SkillReference,
  TestConnectionResult,
}

// Re-export provider info
export { LLM_PROVIDERS } from '../types/settings'

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

// Get all workflows for a ComfyUI config
export async function getComfyuiWorkflows(comfyuiId: string): Promise<ComfyuiWorkflow[]> {
  return await invoke<ComfyuiWorkflow[]>('get_comfyui_workflows', { comfyuiId })
}

// Save or update a ComfyUI workflow
export async function saveComfyuiWorkflow(workflow: ComfyuiWorkflow): Promise<ComfyuiWorkflow> {
  return await invoke<ComfyuiWorkflow>('save_comfyui_workflow', { workflow })
}

// Delete a ComfyUI workflow
export async function deleteComfyuiWorkflow(id: string): Promise<string> {
  return await invoke<string>('delete_comfyui_workflow', { id })
}

// Test LLM connection
export async function testLlmConnection(config: LlmConfig): Promise<TestConnectionResult> {
  return await invoke<TestConnectionResult>('test_llm_connection', { config })
}

// Test ComfyUI connection
export async function testComfyuiConnection(config: ComfyuiConfig): Promise<TestConnectionResult> {
  return await invoke<TestConnectionResult>('test_comfyui_connection', { config })
}

// ==================== Projects API ====================

// Get all projects
export async function getProjects(): Promise<ProjectInfoData[]> {
  return await invoke<ProjectInfoData[]>('get_projects')
}

// Save or update a project
export async function saveProjectMeta(project: ProjectInfoData): Promise<ProjectInfoData> {
  return await invoke<ProjectInfoData>('save_project_meta', { project })
}

// Delete a project
export async function deleteProjectById(id: string): Promise<string> {
  return await invoke<string>('delete_project_by_id', { id })
}

// ==================== Canvases API ====================

// Get all canvases (recent)
export async function getAllCanvases(): Promise<CanvasInfo[]> {
  return await invoke<CanvasInfo[]>('get_all_canvases')
}

// Get canvases by project
export async function getCanvasesByProject(projectId: string): Promise<CanvasInfo[]> {
  return await invoke<CanvasInfo[]>('get_canvases_by_project', { projectId })
}

// Get a single canvas by ID
export async function getCanvasById(id: string): Promise<CanvasInfo> {
  return await invoke<CanvasInfo>('get_canvas_by_id', { id })
}

// Save or update a canvas
export async function saveCanvasMeta(canvas: CanvasInfo): Promise<CanvasInfo> {
  return await invoke<CanvasInfo>('save_canvas_meta', { canvas })
}

// Delete a canvas
export async function deleteCanvasById(id: string): Promise<string> {
  return await invoke<string>('delete_canvas_by_id', { id })
}

// Update canvas preview (JSON array of media paths)
export async function updateCanvasPreview(id: string, preview: string): Promise<string> {
  return await invoke<string>('update_canvas_preview', { id, preview })
}

// ==================== Canvas Data Commands ====================

// Save canvas data (nodes, edges, viewport)
export async function saveCanvasData(id: string, data: CanvasData): Promise<string> {
  return await invoke<string>('save_canvas_data', { id, data })
}

// Load canvas data
export async function loadCanvasData(id: string): Promise<CanvasData> {
  return await invoke<CanvasData>('load_canvas_data', { id })
}

// Upload media from URL and return local path
export async function uploadMedia(url: string, filename: string): Promise<string> {
  return await invoke<string>('upload_media', { url, filename })
}

// Upload local file data and return relative path
export async function uploadFile(filename: string, data: Uint8Array): Promise<string> {
  return await invoke<string>('upload_file', { filename, data })
}

// Get asset path using Tauri 2 path API
async function getAssetPath(filename: string): Promise<string> {
  return await invoke<string>('get_asset_path', { filename })
}

// Get file URL for direct access via asset:// protocol
export async function getFileUrl(relativePath: string): Promise<string> {
  // Strip "assets/" prefix since uploads_dir already includes it
  const filename = relativePath.replace(/^assets\//, '')

  // Use Tauri 2's path API to get correct asset path
  const fullPath = await getAssetPath(filename)

  // Use convertFileSrc to generate correct asset URL
  return convertFileSrc(fullPath)
}

// ==================== Skills API ====================

// Get all skills
export async function getSkills(): Promise<SkillMeta[]> {
  return await invoke<SkillMeta[]>('list_skills')
}

// Get a single skill by id
export async function getSkill(id: string): Promise<SkillInfo> {
  return await invoke<SkillInfo>('read_skill', { id })
}

// Save a skill
export async function saveSkill(id: string, content: string): Promise<void> {
  return await invoke<void>('save_skill', { id, content })
}

// Delete a skill
export async function deleteSkill(id: string): Promise<void> {
  return await invoke<void>('delete_skill', { id })
}

// Load skill references (Level 3: references/ or scripts/)
export async function loadSkillReference(id: string, level: 'references' | 'scripts'): Promise<SkillReference[]> {
  return await invoke<SkillReference[]>('load_skill_reference', { id, level })
}

// Read skill raw file content (including YAML frontmatter)
export async function readSkillRaw(id: string): Promise<string> {
  return await invoke<string>('read_skill_raw', { id })
}
