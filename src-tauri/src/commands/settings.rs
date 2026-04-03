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

/// Get all workflows for a ComfyUI config
#[tauri::command]
pub fn get_comfyui_workflows(
    comfyui_id: String,
    state: tauri::State<AppState>,
) -> Result<Vec<ComfyuiWorkflow>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, comfyui_id, name, workflow_data FROM comfyui_workflows WHERE comfyui_id = ?1 ORDER BY name")
        .map_err(|e| e.to_string())?;

    let workflows: Vec<ComfyuiWorkflow> = stmt
        .query_map([&comfyui_id], |row| {
            Ok(ComfyuiWorkflow {
                id: row.get(0)?,
                comfyui_id: row.get(1)?,
                name: row.get(2)?,
                workflow_data: row.get(3)?,
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

/// Save or update a ComfyUI workflow
#[tauri::command]
pub fn save_comfyui_workflow(
    workflow: ComfyuiWorkflow,
    state: tauri::State<AppState>,
) -> Result<ComfyuiWorkflow, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT OR REPLACE INTO comfyui_workflows (id, comfyui_id, name, workflow_data, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![workflow.id, workflow.comfyui_id, workflow.name, workflow.workflow_data, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(workflow)
}

/// Delete a ComfyUI workflow
#[tauri::command]
pub fn delete_comfyui_workflow(id: String, state: tauri::State<AppState>) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM comfyui_workflows WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(format!("Workflow '{}' deleted", id))
}
