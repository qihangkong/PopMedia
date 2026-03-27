use crate::models::{CanvasData, CanvasInfo, ProjectInfoData};
use crate::AppState;
use rusqlite::params;

fn get_canvases_dir() -> std::path::PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("PopMedia")
        .join("canvases")
}

fn get_uploads_dir() -> std::path::PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("PopMedia")
        .join("uploads")
}

// ==================== Projects API Commands ====================

/// Get all projects
#[tauri::command]
pub fn get_projects(state: tauri::State<AppState>) -> Result<Vec<ProjectInfoData>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, thumbnail, created_at, updated_at FROM projects ORDER BY updated_at DESC",
        )
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
pub fn save_project_meta(
    project: ProjectInfoData,
    state: tauri::State<AppState>,
) -> Result<ProjectInfoData, String> {
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
pub fn delete_project_by_id(id: String, state: tauri::State<AppState>) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM projects WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(format!("Project '{}' deleted", id))
}

// ==================== Canvases API Commands ====================

/// Get all canvases for a project
#[tauri::command]
pub fn get_canvases_by_project(
    project_id: String,
    state: tauri::State<AppState>,
) -> Result<Vec<CanvasInfo>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, thumbnail, preview, project_id, created_at, updated_at
             FROM canvases WHERE project_id = ?1 ORDER BY updated_at DESC",
        )
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
pub fn get_all_canvases(state: tauri::State<AppState>) -> Result<Vec<CanvasInfo>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, thumbnail, preview, project_id, created_at, updated_at
             FROM canvases ORDER BY updated_at DESC LIMIT 20",
        )
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
pub fn save_canvas_meta(canvas: CanvasInfo, state: tauri::State<AppState>) -> Result<CanvasInfo, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO canvases (id, name, thumbnail, preview, project_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            canvas.id,
            canvas.name,
            canvas.thumbnail,
            canvas.preview,
            canvas.project_id,
            canvas.created_at,
            canvas.updated_at
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(canvas)
}

/// Delete a canvas
#[tauri::command]
pub fn delete_canvas_by_id(id: String, state: tauri::State<AppState>) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM canvases WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(format!("Canvas '{}' deleted", id))
}

/// Update canvas preview (JSON array of media paths)
#[tauri::command]
pub fn update_canvas_preview(
    id: String,
    preview: String,
    state: tauri::State<AppState>,
) -> Result<String, String> {
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

/// Save canvas data to file
#[tauri::command]
pub fn save_canvas_data(id: String, data: CanvasData) -> Result<String, String> {
    let app_data = get_canvases_dir();
    std::fs::create_dir_all(&app_data).map_err(|e| e.to_string())?;

    let file_path = app_data.join(format!("{}.json", id));
    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    std::fs::write(&file_path, json).map_err(|e| e.to_string())?;

    Ok(format!("Canvas '{}' saved successfully", id))
}

/// Load canvas data from file
#[tauri::command]
pub fn load_canvas_data(id: String) -> Result<CanvasData, String> {
    let app_data = get_canvases_dir();
    let file_path = app_data.join(format!("{}.json", id));
    let content =
        std::fs::read_to_string(&file_path).map_err(|e| format!("Failed to load canvas: {}", e))?;
    let data: CanvasData =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse canvas: {}", e))?;

    Ok(data)
}

/// Upload media file and return local path
#[tauri::command]
pub async fn upload_media(url: String, filename: String) -> Result<String, String> {
    let app_data = get_uploads_dir();
    std::fs::create_dir_all(&app_data).map_err(|e| e.to_string())?;

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
    std::fs::write(&local_path, &bytes).map_err(|e| format!("Write failed: {}", e))?;

    Ok(format!("uploads/{}", local_filename))
}