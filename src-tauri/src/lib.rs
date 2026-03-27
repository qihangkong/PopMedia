use rusqlite::{params, Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectInfo {
    pub name: String,
    pub version: String,
    pub app_data_dir: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveResult {
    pub success: bool,
    pub path: String,
    pub message: String,
}

// LLM Config struct for serialization
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LlmConfig {
    pub id: String,
    pub name: String,
    pub api_url: String,
    pub api_key: String,
    pub model_name: String,
}

// ComfyUI Config struct for serialization
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ComfyuiConfig {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: String,
}

// Canvas metadata for database storage
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CanvasInfo {
    pub id: String,
    pub name: String,
    pub thumbnail: Option<String>,
    pub preview: Option<String>,  // JSON array of recent media paths for preview
    pub project_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

// Project metadata for database storage
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectInfoData {
    pub id: String,
    pub name: String,
    pub thumbnail: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

// State wrapper for database connection
pub struct AppState {
    pub db: Mutex<Connection>,
}

fn get_db_path() -> PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("PopMedia")
        .join("popmedia.db")
}

fn init_database(conn: &Connection) -> SqliteResult<()> {
    let migration_sql = include_str!("../migrations/001_initial.sql");
    conn.execute_batch(migration_sql)?;
    // Run additional migrations (only if column doesn't exist)
    let has_preview: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('canvases') WHERE name = 'preview'",
        [],
        |row| row.get(0),
    )?;
    if !has_preview {
        conn.execute("ALTER TABLE canvases ADD COLUMN preview TEXT", [])?;
    }
    Ok(())
}

/// Get app info
#[tauri::command]
fn get_app_info() -> ProjectInfo {
    ProjectInfo {
        name: "PopMedia".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        app_data_dir: "".to_string(),
    }
}

/// Save project data to app data directory
#[tauri::command]
fn save_project(name: String, data: String) -> Result<SaveResult, String> {
    let app_data = dirs::data_local_dir()
        .ok_or("Failed to get app data directory")?
        .join("PopMedia")
        .join("projects");

    fs::create_dir_all(&app_data).map_err(|e| e.to_string())?;

    let file_path = app_data.join(format!("{}.json", sanitize_filename(&name)));
    fs::write(&file_path, &data).map_err(|e| e.to_string())?;

    Ok(SaveResult {
        success: true,
        path: file_path.to_string_lossy().to_string(),
        message: format!("Project '{}' saved successfully", name),
    })
}

/// Load project data from app data directory
#[tauri::command]
fn load_project(name: String) -> Result<String, String> {
    let app_data = dirs::data_local_dir()
        .ok_or("Failed to get app data directory")?
        .join("PopMedia")
        .join("projects");

    let file_path = app_data.join(format!("{}.json", sanitize_filename(&name)));
    fs::read_to_string(&file_path).map_err(|e| format!("Failed to load project: {}", e))
}

/// List all saved projects
#[tauri::command]
fn list_projects() -> Result<Vec<String>, String> {
    let app_data = dirs::data_local_dir()
        .ok_or("Failed to get app data directory")?
        .join("PopMedia")
        .join("projects");

    if !app_data.exists() {
        return Ok(vec![]);
    }

    let entries = fs::read_dir(&app_data)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| {
            let path = entry.ok()?.path();
            if path.extension().map_or(false, |ext| ext == "json") {
                path.file_stem()
                    .and_then(|s| s.to_str())
                    .map(|s| s.to_string())
            } else {
                None
            }
        })
        .collect();

    Ok(entries)
}

/// Delete a saved project
#[tauri::command]
fn delete_project(name: String) -> Result<String, String> {
    let app_data = dirs::data_local_dir()
        .ok_or("Failed to get app data directory")?
        .join("PopMedia")
        .join("projects");

    let file_path = app_data.join(format!("{}.json", sanitize_filename(&name)));
    if file_path.exists() {
        fs::remove_file(&file_path).map_err(|e| e.to_string())?;
    }

    Ok(format!("Project '{}' deleted", name))
}

// ==================== Settings API Commands ====================

/// Get all LLM configs
#[tauri::command]
fn get_llm_configs(state: tauri::State<AppState>) -> Result<Vec<LlmConfig>, String> {
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
fn save_llm_config(config: LlmConfig, state: tauri::State<AppState>) -> Result<LlmConfig, String> {
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
fn delete_llm_config(id: String, state: tauri::State<AppState>) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM llm_configs WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(format!("LLM config '{}' deleted", id))
}

/// Get all ComfyUI configs
#[tauri::command]
fn get_comfyui_configs(state: tauri::State<AppState>) -> Result<Vec<ComfyuiConfig>, String> {
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
fn save_comfyui_config(config: ComfyuiConfig, state: tauri::State<AppState>) -> Result<ComfyuiConfig, String> {
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
fn delete_comfyui_config(id: String, state: tauri::State<AppState>) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM comfyui_configs WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(format!("ComfyUI config '{}' deleted", id))
}

/// Test LLM API connection
#[tauri::command]
async fn test_llm_connection(config: LlmConfig) -> Result<String, String> {
    log::info!("开始测试 LLM 连接: {}", config.name);
    log::info!("API URL: {}", config.api_url);
    log::info!("Model: {}", config.model_name);

    if config.api_url.is_empty() {
        log::error!("API URL 为空");
        return Err("API URL is required".to_string());
    }

    let client = reqwest::Client::new();
    let api_url = config.api_url.trim_end_matches('/');
    log::info!("处理后的 API URL: {}/models", api_url);

    // Step 1: Check if /models endpoint is accessible
    log::info!("步骤 1: 检查 /models 端点...");
    let models_response = client
        .get(&format!("{}/models", api_url))
        .header("Authorization", format!("Bearer {}", config.api_key))
        .header("Content-Type", "application/json")
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await;

    let models_response = match models_response {
        Ok(resp) => {
            log::info!("收到 /models 响应, 状态码: {}", resp.status());
            resp
        }
        Err(e) => {
            log::error!("连接 /models 失败: {}", e);
            return Err(format!("连接失败: {}", e));
        }
    };

    if !models_response.status().is_success() {
        let status = models_response.status();
        let body = models_response.text().await.unwrap_or_default();
        log::error!("/models 响应错误, 状态码: {}, body: {}", status, body);
        return Err(format!("API 不可访问 ({}): {}", status, body));
    }

    log::info!("步骤 1 完成: /models 端点可访问");

    // Step 2: Send a test message to verify the API can respond
    let model_name = if config.model_name.is_empty() {
        log::info!("model_name 为空, 使用默认: gpt-3.5-turbo");
        "gpt-3.5-turbo"
    } else {
        &config.model_name
    };

    let request_body = serde_json::json!({
        "model": model_name,
        "messages": [
            {"role": "user", "content": "请直接回复：你好，不需要思考过程"}
        ],
        "max_tokens": 50,
        "temperature": 0.7
    });

    log::info!("步骤 2: 发送测试消息到 /chat/completions...");
    log::debug!("请求体: {}", request_body);

    let chat_response = client
        .post(&format!("{}/chat/completions", api_url))
        .header("Authorization", format!("Bearer {}", config.api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await;

    let chat_response = match chat_response {
        Ok(resp) => {
            log::info!("收到 /chat/completions 响应, 状态码: {}", resp.status());
            resp
        }
        Err(e) => {
            log::error!("请求 /chat/completions 失败: {}", e);
            return Err(format!("API 请求失败: {}", e));
        }
    };

    let status = chat_response.status();
    if !status.is_success() {
        let body = chat_response.text().await.unwrap_or_default();
        log::error!("chat/completions 响应错误, 状态码: {}, body: {}", status, body);
        return Err(format!("API 响应错误 ({}): {}", status, body));
    }

    log::info!("步骤 2 完成: 收到成功响应");

    // Verify we got a valid response with content
    let response_body: serde_json::Value = chat_response
        .json()
        .await
        .map_err(|e| {
            log::error!("解析响应 JSON 失败: {}", e);
            format!("解析响应失败: {}", e)
        })?;

    log::info!("响应体: {}", response_body);

    // Try different response formats (OpenAI, Chinese APIs like 智谱AI)
    let content = response_body.get("choices")
        .and_then(|c| c.as_array())
        .and_then(|choices| choices.first())
        .and_then(|choice| {
            // Try message.content (OpenAI format)
            choice.get("message")
                .and_then(|msg| {
                    // First try content, then reasoning_content (智谱AI uses this)
                    msg.get("content")
                        .and_then(|c| c.as_str())
                        .filter(|s| !s.is_empty())
                        .or_else(|| {
                            msg.get("reasoning_content")
                                .and_then(|rc| rc.as_str())
                                .filter(|s| !s.is_empty())
                        })
                })
                .or_else(|| {
                    // Try delta.content (streaming format)
                    choice.get("delta")
                        .and_then(|delta| delta.get("content"))
                        .and_then(|c| c.as_str())
                })
                .or_else(|| {
                    // Try text (some Chinese APIs)
                    choice.get("text")
                        .and_then(|t| t.as_str())
                })
        });

    if let Some(text) = content {
        if !text.is_empty() {
            log::info!("测试成功! AI 回复: {}", text);
            return Ok(format!("连接成功! API 回复: {}", text));
        }
    }

    log::error!("响应格式无效, 缺少 content 字段");
    Err("API 响应格式无效".to_string())
}

// ==================== Projects API Commands ====================

/// Get all projects
#[tauri::command]
fn get_projects(state: tauri::State<AppState>) -> Result<Vec<ProjectInfoData>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, thumbnail, created_at, updated_at FROM projects ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let projects = stmt
        .query_map([], |row| {
            Ok(ProjectInfoData {
                id: row.get(0)?,
                name: row.get(1)?,
                thumbnail: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(projects)
}

/// Save or update a project
#[tauri::command]
fn save_project_meta(project: ProjectInfoData, state: tauri::State<AppState>) -> Result<ProjectInfoData, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO projects (id, name, thumbnail, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![project.id, project.name, project.thumbnail, project.created_at, project.updated_at],
    )
    .map_err(|e| e.to_string())?;

    Ok(project)
}

/// Delete a project
#[tauri::command]
fn delete_project_by_id(id: String, state: tauri::State<AppState>) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM projects WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(format!("Project '{}' deleted", id))
}

// ==================== Canvases API Commands ====================

/// Get all canvases for a project
#[tauri::command]
fn get_canvases_by_project(project_id: String, state: tauri::State<AppState>) -> Result<Vec<CanvasInfo>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, thumbnail, preview, project_id, created_at, updated_at FROM canvases WHERE project_id = ?1 ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let canvases = stmt
        .query_map(params![project_id], |row| {
            Ok(CanvasInfo {
                id: row.get(0)?,
                name: row.get(1)?,
                thumbnail: row.get(2)?,
                preview: row.get(3)?,
                project_id: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(canvases)
}

/// Get all canvases (recent)
#[tauri::command]
fn get_all_canvases(state: tauri::State<AppState>) -> Result<Vec<CanvasInfo>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, thumbnail, preview, project_id, created_at, updated_at FROM canvases ORDER BY updated_at DESC LIMIT 20")
        .map_err(|e| e.to_string())?;

    let canvases = stmt
        .query_map([], |row| {
            Ok(CanvasInfo {
                id: row.get(0)?,
                name: row.get(1)?,
                thumbnail: row.get(2)?,
                preview: row.get(3)?,
                project_id: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(canvases)
}

/// Save or update a canvas
#[tauri::command]
fn save_canvas_meta(canvas: CanvasInfo, state: tauri::State<AppState>) -> Result<CanvasInfo, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO canvases (id, name, thumbnail, preview, project_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![canvas.id, canvas.name, canvas.thumbnail, canvas.preview, canvas.project_id, canvas.created_at, canvas.updated_at],
    )
    .map_err(|e| e.to_string())?;

    Ok(canvas)
}

/// Delete a canvas
#[tauri::command]
fn delete_canvas_by_id(id: String, state: tauri::State<AppState>) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM canvases WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(format!("Canvas '{}' deleted", id))
}

/// Update canvas preview (JSON array of media paths)
#[tauri::command]
fn update_canvas_preview(id: String, preview: String, state: tauri::State<AppState>) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE canvases SET preview = ?1, updated_at = ?2 WHERE id = ?3",
        params![preview, now, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(format!("Canvas '{}' preview updated", id))
}

// ==================== Canvas Data Commands ====================

/// Canvas data structure for JSON file
#[derive(Debug, Serialize, Deserialize)]
pub struct CanvasData {
    pub nodes: serde_json::Value,
    pub edges: serde_json::Value,
    pub viewport: Option<serde_json::Value>,
}

/// Save canvas data to file
#[tauri::command]
fn save_canvas_data(id: String, data: CanvasData) -> Result<String, String> {
    let app_data = dirs::data_local_dir()
        .ok_or("Failed to get app data directory")?
        .join("PopMedia")
        .join("canvases");

    fs::create_dir_all(&app_data).map_err(|e| e.to_string())?;

    let file_path = app_data.join(format!("{}.json", id));
    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(&file_path, json).map_err(|e| e.to_string())?;

    Ok(format!("Canvas '{}' saved successfully", id))
}

/// Load canvas data from file
#[tauri::command]
fn load_canvas_data(id: String) -> Result<CanvasData, String> {
    let app_data = dirs::data_local_dir()
        .ok_or("Failed to get app data directory")?
        .join("PopMedia")
        .join("canvases");

    let file_path = app_data.join(format!("{}.json", id));
    let content = fs::read_to_string(&file_path).map_err(|e| format!("Failed to load canvas: {}", e))?;
    let data: CanvasData = serde_json::from_str(&content).map_err(|e| format!("Failed to parse canvas: {}", e))?;

    Ok(data)
}

/// Upload media file and return local path
#[tauri::command]
async fn upload_media(url: String, filename: String) -> Result<String, String> {
    let app_data = dirs::data_local_dir()
        .ok_or("Failed to get app data directory")?
        .join("PopMedia")
        .join("uploads");

    fs::create_dir_all(&app_data).map_err(|e| e.to_string())?;

    let ext = filename.rsplit('.').next().unwrap_or("bin");
    let local_filename = format!("{}.{}", uuid::Uuid::new_v4(), ext);
    let local_path = app_data.join(&local_filename);

    // Download from URL
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("Download failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Download failed with status: {}", response.status()));
    }

    let bytes = response.bytes().await.map_err(|e| format!("Read failed: {}", e))?;
    fs::write(&local_path, &bytes).map_err(|e| format!("Write failed: {}", e))?;

    Ok(format!("uploads/{}", local_filename))
}

/// Test ComfyUI connection
#[tauri::command]
async fn test_comfyui_connection(config: ComfyuiConfig) -> Result<String, String> {
    if config.host.is_empty() {
        return Err("Host is required".to_string());
    }

    let client = reqwest::Client::new();
    let url = format!("http://{}:{}/system_stats", config.host, config.port);

    let response = client
        .get(&url)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    if response.status().is_success() {
        Ok("Connection successful!".to_string())
    } else {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        Err(format!("Connection failed: {} - {}", status, body))
    }
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize database
    let db_path = get_db_path();
    if let Some(parent) = db_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let conn = Connection::open(&db_path).expect("Failed to open database");
    init_database(&conn).expect("Failed to initialize database");

    let app_state = AppState {
        db: Mutex::new(conn),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(app_state)
        .setup(|app| {
            // Create app data directory on first run
            if let Some(app_data) = dirs::data_local_dir() {
                let app_dir = app_data.join("PopMedia").join("projects");
                let _ = fs::create_dir_all(&app_dir);

                // Setup logging
                let log_dir = app_data.join("PopMedia").join("logs");
                let _ = fs::create_dir_all(&log_dir);

                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .target(tauri_plugin_log::Target::new(
                            tauri_plugin_log::TargetKind::Folder {
                                path: log_dir.clone(),
                                file_name: Some("popmedia".to_string()),
                            },
                        ))
                        .build(),
                )?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_info,
            save_project,
            load_project,
            list_projects,
            delete_project,
            // Settings commands
            get_llm_configs,
            save_llm_config,
            delete_llm_config,
            get_comfyui_configs,
            save_comfyui_config,
            delete_comfyui_config,
            test_llm_connection,
            test_comfyui_connection,
            // Projects & Canvases commands
            get_projects,
            save_project_meta,
            delete_project_by_id,
            get_canvases_by_project,
            get_all_canvases,
            save_canvas_meta,
            delete_canvas_by_id,
            update_canvas_preview,
            // Canvas data commands
            save_canvas_data,
            load_canvas_data,
            upload_media,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
