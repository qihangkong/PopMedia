use crate::models::{ComfyuiConfig, ComfyuiWorkflow, LlmConfig, LlmProviderType};
use crate::AppState;
use rusqlite::params;

/// Get all LLM configs
#[tauri::command]
pub fn get_llm_configs(state: tauri::State<AppState>) -> Result<Vec<LlmConfig>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, provider_type, api_url, api_key, model_name FROM llm_configs ORDER BY name")
        .map_err(|e| e.to_string())?;

    let configs: Vec<LlmConfig> = stmt
        .query_map([], |row| {
            let provider_type_str: String = row.get(2)?;
            log::info!("get_llm_configs: raw provider_type from DB = '{}'", provider_type_str);
            // Parse provider type - handle both quoted and unquoted formats
            let provider_type = match provider_type_str.as_str() {
                "openai" => LlmProviderType::OpenAi,
                "volcengine" => LlmProviderType::VolcEngine,
                "baidu" => LlmProviderType::Baidu,
                "alibaba" => LlmProviderType::Alibaba,
                "zhipu" => LlmProviderType::Zhipu,
                "minimax" => LlmProviderType::MiniMax,
                "volcengine_coding" => LlmProviderType::VolcEngineCoding,
                "alibaba_coding" => LlmProviderType::AlibabaCoding,
                "custom" => LlmProviderType::Custom,
                other => {
                    log::warn!("Unknown provider_type '{}', using Custom", other);
                    LlmProviderType::Custom
                }
            };
            log::info!("get_llm_configs: parsed provider_type = {:?}", provider_type);
            Ok(LlmConfig {
                id: row.get(0)?,
                name: row.get(1)?,
                provider_type,
                api_url: row.get(3)?,
                api_key: row.get(4)?,
                model_name: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|e| {
            log::error!("Failed to read LLM configs: {}", e);
            format!("Failed to read LLM configs: {}", e)
        })?;

    Ok(configs)
}

/// Save or update an LLM config
#[tauri::command]
pub fn save_llm_config(config: LlmConfig, state: tauri::State<AppState>) -> Result<LlmConfig, String> {
    log::info!("save_llm_config called: {:?}", config);

    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let provider_type_str = serde_json::to_string(&config.provider_type)
        .map_err(|e| e.to_string())?
        .trim_matches('"')
        .to_string();

    log::info!("Saving provider_type as: {}", provider_type_str);

    conn.execute(
        "INSERT OR REPLACE INTO llm_configs (id, name, provider_type, api_url, api_key, model_name)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![config.id, config.name, provider_type_str, config.api_url, config.api_key, config.model_name],
    )
    .map_err(|e| e.to_string())?;

    Ok(config)
}

/// Delete an LLM config
#[tauri::command]
pub fn delete_llm_config(id: String, state: tauri::State<AppState>) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM llm_configs WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(format!("LLM config '{}' deleted", id))
}

/// Get all ComfyUI configs
#[tauri::command]
pub fn get_comfyui_configs(state: tauri::State<AppState>) -> Result<Vec<ComfyuiConfig>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, host, port FROM comfyui_configs ORDER BY name")
        .map_err(|e| e.to_string())?;

    let configs: Vec<ComfyuiConfig> = stmt
        .query_map([], |row| {
            Ok(ComfyuiConfig {
                id: row.get(0)?,
                name: row.get(1)?,
                host: row.get(2)?,
                port: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|e| {
            log::error!("Failed to read ComfyUI configs: {}", e);
            format!("Failed to read ComfyUI configs: {}", e)
        })?;

    Ok(configs)
}

/// Save or update a ComfyUI config
#[tauri::command]
pub fn save_comfyui_config(
    config: ComfyuiConfig,
    state: tauri::State<AppState>,
) -> Result<ComfyuiConfig, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO comfyui_configs (id, name, host, port)
         VALUES (?1, ?2, ?3, ?4)",
        params![config.id, config.name, config.host, config.port],
    )
    .map_err(|e| e.to_string())?;

    Ok(config)
}

/// Delete a ComfyUI config
#[tauri::command]
pub fn delete_comfyui_config(id: String, state: tauri::State<AppState>) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM comfyui_configs WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(format!("ComfyUI config '{}' deleted", id))
}

/// Get the workflows directory path
fn get_workflows_dir() -> Result<std::path::PathBuf, String> {
    let base_dir = dirs::data_local_dir()
        .ok_or_else(|| "Failed to get local data directory".to_string())?;
    Ok(base_dir.join("PopMedia").join("workflows"))
}

/// Get all workflows for a ComfyUI config
#[tauri::command]
pub fn get_comfyui_workflows(
    comfyui_id: String,
    state: tauri::State<AppState>,
) -> Result<Vec<ComfyuiWorkflow>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, comfyui_id, name, file_path FROM comfyui_workflows WHERE comfyui_id = ?1 ORDER BY name")
        .map_err(|e| e.to_string())?;

    let workflows: Vec<ComfyuiWorkflow> = stmt
        .query_map([&comfyui_id], |row| {
            Ok(ComfyuiWorkflow {
                id: row.get(0)?,
                comfyui_id: row.get(1)?,
                name: row.get(2)?,
                file_path: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|e| {
            log::error!("Failed to read ComfyUI workflows: {}", e);
            format!("Failed to read ComfyUI workflows: {}", e)
        })?;

    Ok(workflows)
}

/// Upload and save a ComfyUI workflow (save file to disk and metadata to DB)
#[tauri::command]
pub fn upload_comfyui_workflow(
    comfyui_id: String,
    name: String,
    json_content: String,
    state: tauri::State<AppState>,
) -> Result<ComfyuiWorkflow, String> {
    let workflows_dir = get_workflows_dir()?;
    let workflow_id = uuid::Uuid::new_v4().to_string();

    // Create directory: workflows/{comfyui_id}/
    let workflow_dir = workflows_dir.join(&comfyui_id);
    std::fs::create_dir_all(&workflow_dir)
        .map_err(|e| format!("Failed to create workflow directory: {}", e))?;

    // Save file: workflows/{comfyui_id}/{workflow_id}.json
    let file_path = workflow_dir.join(format!("{}.json", &workflow_id));
    std::fs::write(&file_path, &json_content)
        .map_err(|e| format!("Failed to write workflow file: {}", e))?;

    let file_path_str = file_path.to_string_lossy().to_string();

    // Save metadata to database
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO comfyui_workflows (id, comfyui_id, name, file_path, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![workflow_id, comfyui_id, name, file_path_str, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(ComfyuiWorkflow {
        id: workflow_id,
        comfyui_id,
        name,
        file_path: file_path_str,
    })
}

/// Delete a ComfyUI workflow (delete file and DB record)
#[tauri::command]
pub fn delete_comfyui_workflow(id: String, state: tauri::State<AppState>) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // First get the file_path to delete the file
    let file_path: String = conn.query_row(
        "SELECT file_path FROM comfyui_workflows WHERE id = ?1",
        [&id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    // Delete the file
    if std::path::Path::new(&file_path).exists() {
        std::fs::remove_file(&file_path)
            .map_err(|e| format!("Failed to delete workflow file: {}", e))?;
    }

    // Delete from database
    conn.execute("DELETE FROM comfyui_workflows WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(format!("Workflow '{}' deleted", id))
}

/// Load workflow JSON content from file
#[tauri::command]
pub fn load_comfyui_workflow_file(file_path: String) -> Result<String, String> {
    std::fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read workflow file: {}", e))
}
