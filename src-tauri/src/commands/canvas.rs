use crate::commands::HttpClient;
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
        .join("assets")
}

// ==================== Projects API Commands ====================

/// Get all projects
#[tauri::command]
pub fn get_projects(state: tauri::State<AppState>) -> Result<Vec<ProjectInfoData>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, thumbnail, description, video_ratio, video_style, created_at, updated_at FROM projects ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let projects: Vec<ProjectInfoData> = stmt
        .query_map([], |row| {
            Ok(ProjectInfoData {
                id: row.get(0)?,
                name: row.get(1)?,
                thumbnail: row.get(2)?,
                description: row.get(3)?,
                video_ratio: row.get(4)?,
                video_style: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|e| {
            log::error!("Failed to read projects: {}", e);
            format!("Failed to read projects: {}", e)
        })?;

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
        "INSERT OR REPLACE INTO projects (id, name, thumbnail, description, video_ratio, video_style, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            project.id,
            project.name,
            project.thumbnail,
            project.description,
            project.video_ratio,
            project.video_style,
            project.created_at,
            project.updated_at
        ],
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

    let canvases: Vec<CanvasInfo> = stmt
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
        .collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|e| {
            log::error!("Failed to read canvases: {}", e);
            format!("Failed to read canvases: {}", e)
        })?;

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

    let canvases: Vec<CanvasInfo> = stmt
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
        .collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|e| {
            log::error!("Failed to read canvases: {}", e);
            format!("Failed to read canvases: {}", e)
        })?;

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

/// Get a single canvas by ID
#[tauri::command]
pub fn get_canvas_by_id(id: String, state: tauri::State<AppState>) -> Result<CanvasInfo, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, thumbnail, preview, project_id, created_at, updated_at
             FROM canvases WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let canvas = stmt
        .query_row(params![id], |row| {
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
        .map_err(|e| e.to_string())?;

    Ok(canvas)
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

/// Save canvas data to file (async to avoid blocking the main thread)
#[tauri::command]
pub async fn save_canvas_data(id: String, data: CanvasData) -> Result<String, String> {
    let app_data = get_canvases_dir();
    tokio::fs::create_dir_all(&app_data).await.map_err(|e| e.to_string())?;

    let file_path = app_data.join(format!("{}.json", id));
    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    tokio::fs::write(&file_path, json).await.map_err(|e| e.to_string())?;

    Ok(format!("Canvas '{}' saved successfully", id))
}

/// Load canvas data from file (async to avoid blocking the main thread)
#[tauri::command]
pub async fn load_canvas_data(id: String) -> Result<CanvasData, String> {
    let app_data = get_canvases_dir();
    let file_path = app_data.join(format!("{}.json", id));
    let content =
        tokio::fs::read_to_string(&file_path).await.map_err(|e| format!("Failed to load canvas: {}", e))?;
    let data: CanvasData =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse canvas: {}", e))?;

    Ok(data)
}

/// Upload media file and return local path
/// Uses content-addressable storage: same content = same file (deduplication via SHA256 hash)
#[tauri::command]
pub async fn upload_media(
    url: String,
    filename: String,
    http_client: tauri::State<'_, HttpClient>,
) -> Result<String, String> {
    use sha2::{Sha256, Digest};

    let uploads_dir = get_uploads_dir();
    std::fs::create_dir_all(&uploads_dir).map_err(|e| e.to_string())?;

    // Download from URL first
    let response = http_client
        .get(&url)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("Download failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Download failed with status: {}", response.status()));
    }

    let bytes = response.bytes().await.map_err(|e| format!("Read failed: {}", e))?;

    // Calculate SHA256 hash of content for deduplication
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    let hash = format!("{:x}", hasher.finalize());

    // Extract file extension from right side (rsplit handles cases like "photo.tar.gz" correctly)
    // Falls back to "bin" only if filename has no dot at all (e.g., "photo" -> "bin")
    let ext = filename.rsplit('.').next().unwrap_or("bin");
    let local_filename = format!("{}.{}", hash, ext);
    let file_path = uploads_dir.join(&local_filename);

    // Only write if file doesn't exist (deduplication)
    if !file_path.exists() {
        std::fs::write(&file_path, &bytes).map_err(|e| format!("Write failed: {}", e))?;
    }

    Ok(format!("assets/{}", local_filename))
}

/// Upload local file data and return relative path
/// Uses content-addressable storage: same content = same file (deduplication via SHA256 hash)
#[tauri::command]
pub async fn upload_file(filename: String, data: Vec<u8>) -> Result<String, String> {
    use sha2::{Sha256, Digest};

    let uploads_dir = get_uploads_dir();
    std::fs::create_dir_all(&uploads_dir).map_err(|e| e.to_string())?;

    // Calculate SHA256 hash of content for deduplication
    let mut hasher = Sha256::new();
    hasher.update(&data);
    let hash = format!("{:x}", hasher.finalize());

    // Extract file extension from right side (rsplit handles cases like "photo.tar.gz" correctly)
    // Falls back to "bin" only if filename has no dot at all (e.g., "photo" -> "bin")
    let ext = filename.rsplit('.').next().unwrap_or("bin");
    let local_filename = format!("{}.{}", hash, ext);
    let file_path = uploads_dir.join(&local_filename);

    // Only write if file doesn't exist (deduplication)
    if !file_path.exists() {
        std::fs::write(&file_path, &data).map_err(|e| e.to_string())?;
    }

    Ok(format!("assets/{}", local_filename))
}

/// Get asset path - uses same path as upload_file for consistency
#[tauri::command]
pub fn get_asset_path(filename: String) -> Result<String, String> {
    let uploads_dir = get_uploads_dir();
    let asset_path = uploads_dir.join(&filename);
    Ok(asset_path.to_string_lossy().to_string())
}