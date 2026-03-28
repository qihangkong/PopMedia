pub mod canvas;
pub mod chat;
pub mod connections;
pub mod projects;
pub mod settings;

use rusqlite::Connection;
use std::sync::Mutex;

/// State wrapper for database connection
pub struct AppState {
    pub db: Mutex<Connection>,
}

pub use canvas::*;
pub use chat::*;
pub use connections::*;
pub use projects::*;
pub use settings::*;