use crate::models::{ComfyuiConfig, LlmConfig};
use crate::AppState;
use rusqlite::params;

/// Get all LLM configs
#[tauri::command]
pub fn get_llm_configs(state: tauri::State<AppState>) -> Result<Vec<LlmConfig>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, api_url, api_key, model_name FROM llm_configs ORDER BY name")
        .map_err(|e| e.to_string())?;

    let configs = stmt
        .query_map([], |row| {
            Ok(LlmConfig {
                id: row.get(0)?,
                name: row.get(1)?,
                api_url: row.get(2)?,
                api_key: row.get(3)?,
                model_name: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(configs)
}

/// Save or update an LLM config
#[tauri::command]
pub fn save_llm_config(config: LlmConfig, state: tauri::State<AppState>) -> Result<LlmConfig, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO llm_configs (id, name, api_url, api_key, model_name)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![config.id, config.name, config.api_url, config.api_key, config.model_name],
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

    let configs = stmt
        .query_map([], |row| {
            Ok(ComfyuiConfig {
                id: row.get(0)?,
                name: row.get(1)?,
                host: row.get(2)?,
                port: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

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