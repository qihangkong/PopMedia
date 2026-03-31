mod commands;
mod db;
mod models;

#[cfg(test)]
mod tests;

#[cfg(test)]
mod db_tests;

#[cfg(test)]
mod commands_tests;

use commands::http::create_http_client;
use commands::skills::init_default_skills;
use commands::AppState;
use db::{get_db_path, init_database};
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize database
    let db_path = get_db_path();
    if let Some(parent) = db_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let conn = rusqlite::Connection::open(&db_path).expect("Failed to open database");
    init_database(&conn).expect("Failed to initialize database");

    let app_state = AppState {
        db: Mutex::new(conn),
        http_client: create_http_client(),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(app_state)
        .setup(|app| {
            // Create app data directory on first run
            if let Some(app_data) = dirs::data_local_dir() {
                let app_dir = app_data.join("PopMedia").join("projects");
                let _ = std::fs::create_dir_all(&app_dir);

                // Create skills directory
                let skills_dir = app_data.join("PopMedia").join(".skills");
                let _ = std::fs::create_dir_all(&skills_dir);

                // Initialize default skills
                let _ = init_default_skills();

                // Setup logging
                let log_dir = app_data.join("PopMedia").join("logs");
                let _ = std::fs::create_dir_all(&log_dir);

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
            // App info
            commands::get_app_info,
            // Projects (file operations)
            commands::save_project,
            commands::load_project,
            commands::list_projects,
            commands::delete_project,
            // Settings
            commands::get_llm_configs,
            commands::save_llm_config,
            commands::delete_llm_config,
            commands::get_comfyui_configs,
            commands::save_comfyui_config,
            commands::delete_comfyui_config,
            // Connection tests
            commands::test_llm_connection,
            commands::test_comfyui_connection,
            // Projects & Canvases (metadata)
            commands::get_projects,
            commands::save_project_meta,
            commands::delete_project_by_id,
            commands::get_canvases_by_project,
            commands::get_all_canvases,
            commands::get_canvas_by_id,
            commands::save_canvas_meta,
            commands::delete_canvas_by_id,
            commands::update_canvas_preview,
            // Canvas data
            commands::save_canvas_data,
            commands::load_canvas_data,
            commands::upload_media,
            commands::upload_file,
            commands::get_asset_path,
            // Chat
            commands::send_chat_message,
            commands::send_chat_message_with_tools,
            // Skills
            commands::list_skills,
            commands::read_skill,
            commands::read_skill_raw,
            commands::save_skill,
            commands::delete_skill,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
