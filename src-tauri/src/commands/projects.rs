use crate::models::{ProjectInfo, SaveResult};

fn get_projects_dir() -> std::path::PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("PopMedia")
        .join("projects")
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect()
}

/// Get app info
#[tauri::command]
pub fn get_app_info() -> ProjectInfo {
    ProjectInfo {
        name: "PopMedia".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        app_data_dir: "".to_string(),
    }
}

/// Save project data to app data directory
#[tauri::command]
pub fn save_project(name: String, data: String) -> Result<SaveResult, String> {
    let app_data = get_projects_dir();
    std::fs::create_dir_all(&app_data).map_err(|e| e.to_string())?;

    let file_path = app_data.join(format!("{}.json", sanitize_filename(&name)));
    std::fs::write(&file_path, &data).map_err(|e| e.to_string())?;

    Ok(SaveResult {
        success: true,
        path: file_path.to_string_lossy().to_string(),
        message: format!("Project '{}' saved successfully", name),
    })
}

/// Load project data from app data directory
#[tauri::command]
pub fn load_project(name: String) -> Result<String, String> {
    let app_data = get_projects_dir();
    let file_path = app_data.join(format!("{}.json", sanitize_filename(&name)));
    std::fs::read_to_string(&file_path).map_err(|e| format!("Failed to load project: {}", e))
}

/// List all saved projects
#[tauri::command]
pub fn list_projects() -> Result<Vec<String>, String> {
    let app_data = get_projects_dir();

    if !app_data.exists() {
        return Ok(vec![]);
    }

    let entries = std::fs::read_dir(&app_data)
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
pub fn delete_project(name: String) -> Result<String, String> {
    let app_data = get_projects_dir();
    let file_path = app_data.join(format!("{}.json", sanitize_filename(&name)));
    if file_path.exists() {
        std::fs::remove_file(&file_path).map_err(|e| e.to_string())?;
    }

    Ok(format!("Project '{}' deleted", name))
}