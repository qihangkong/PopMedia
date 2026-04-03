use rusqlite::{params, Connection, Result as SqliteResult};
use std::path::PathBuf;

// Embedded migrations: (version, sql_content)
const MIGRATIONS: &[(&str, &str)] = &[
    ("001_initial", include_str!("../migrations/001_initial.sql")),
    ("002_canvas_preview", include_str!("../migrations/002_canvas_preview.sql")),
    ("003_llm_provider_type", include_str!("../migrations/003_llm_provider_type.sql")),
    ("004_project_details", include_str!("../migrations/004_project_details.sql")),
    ("006_comfyui_workflows", include_str!("../migrations/006_comfyui_workflows.sql")),
];

pub fn get_db_path() -> PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("PopMedia")
        .join("popmedia.db")
}

pub fn init_database(conn: &Connection) -> SqliteResult<()> {
    // Create migration tracking table (inline, not a migration itself)
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL
        );"
    )?;

    // Get already applied migrations
    let mut stmt = conn.prepare("SELECT version FROM schema_migrations")?;
    let applied: Vec<String> = stmt
        .query_map([], |row| row.get(0))?
        .collect::<Result<Vec<String>, _>>()
        .map_err(|e| {
            log::warn!("Failed to read migration history, proceeding anyway: {}", e);
            e
        })
        .unwrap_or_default();
    drop(stmt);

    // Apply embedded migrations in order
    let now = chrono::Utc::now().to_rfc3339();
    for (version, sql) in MIGRATIONS {
        if !applied.contains(&version.to_string()) {
            log::info!("Applying migration: {}", version);
            conn.execute_batch(sql)?;
            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (?1, ?2)",
                params![version, now],
            )?;
            log::info!("Migration {} applied successfully", version);
        }
    }

    Ok(())
}