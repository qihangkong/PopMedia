#[cfg(test)]
mod db_tests {
    use rusqlite::Connection;
    use std::path::PathBuf;

    // Inline minimal migrations for testing
    const TEST_MIGRATIONS: &[(&str, &str)] = &[
        ("001_test", "
            CREATE TABLE test_users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL
            );
        "),
    ];

    fn init_test_database(conn: &Connection) -> rusqlite::Result<()> {
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                applied_at TEXT NOT NULL
            );"
        )?;

        let mut stmt = conn.prepare("SELECT version FROM schema_migrations")?;
        let applied: Vec<String> = stmt
            .query_map([], |row| row.get(0))?
            .collect::<Result<Vec<String>, _>>()
            .unwrap_or_default();
        drop(stmt);

        let now = chrono::Utc::now().to_rfc3339();
        for (version, sql) in TEST_MIGRATIONS {
            if !applied.contains(&version.to_string()) {
                conn.execute_batch(sql)?;
                conn.execute(
                    "INSERT INTO schema_migrations (version, applied_at) VALUES (?1, ?2)",
                    rusqlite::params![version, now],
                )?;
            }
        }

        Ok(())
    }

    #[test]
    fn test_get_db_path() {
        let path = crate::db::get_db_path();
        assert!(path.ends_with("PopMedia/popmedia.db"));
    }

    #[test]
    fn test_init_database_creates_tables() {
        let temp_dir = std::env::temp_dir();
        let db_path: PathBuf = temp_dir.join(format!("test_popmedia_{}.db", uuid::Uuid::new_v4()));

        let conn = Connection::open(&db_path).expect("Failed to open test database");
        init_test_database(&conn).expect("Failed to init database");

        // Verify the test_users table was created
        let result: Vec<String> = {
            let mut stmt = conn
                .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='test_users'")
                .unwrap();
            stmt.query_map([], |row| row.get(0))
                .unwrap()
                .collect::<Result<Vec<_>, _>>()
                .unwrap()
        };

        assert_eq!(result, vec!["test_users"]);

        // Cleanup
        drop(conn);
        std::fs::remove_file(&db_path).ok();
    }

    #[test]
    fn test_init_database_creates_migrations_table() {
        let temp_dir = std::env::temp_dir();
        let db_path: PathBuf = temp_dir.join(format!("test_popmedia_{}.db", uuid::Uuid::new_v4()));

        let conn = Connection::open(&db_path).expect("Failed to open test database");
        init_test_database(&conn).expect("Failed to init database");

        // Verify schema_migrations table exists
        let result: Vec<String> = {
            let mut stmt = conn
                .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'")
                .unwrap();
            stmt.query_map([], |row| row.get(0))
                .unwrap()
                .collect::<Result<Vec<_>, _>>()
                .unwrap()
        };

        assert_eq!(result, vec!["schema_migrations"]);

        // Cleanup
        drop(conn);
        std::fs::remove_file(&db_path).ok();
    }

    #[test]
    fn test_migration_not_applied_twice() {
        let temp_dir = std::env::temp_dir();
        let db_path: PathBuf = temp_dir.join(format!("test_popmedia_{}.db", uuid::Uuid::new_v4()));

        let conn = Connection::open(&db_path).expect("Failed to open test database");

        // Apply migrations twice
        init_test_database(&conn).expect("First init should succeed");
        init_test_database(&conn).expect("Second init should also succeed (idempotent)");

        // Verify only one migration record exists
        let count: i64 = {
            let mut stmt = conn
                .prepare("SELECT COUNT(*) FROM schema_migrations WHERE version = '001_test'")
                .unwrap();
            stmt.query_row([], |row| row.get(0))
                .unwrap()
        };

        assert_eq!(count, 1);

        // Cleanup
        drop(conn);
        std::fs::remove_file(&db_path).ok();
    }
}
