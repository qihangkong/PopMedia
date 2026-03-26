use serde::{Deserialize, Serialize};
use std::fs;

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

/// Get app info - demonstrates Rust command calling
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

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Create app data directory on first run
            if let Some(app_data) = dirs::data_local_dir() {
                let app_dir = app_data.join("PopMedia").join("projects");
                let _ = fs::create_dir_all(&app_dir);
            }

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
