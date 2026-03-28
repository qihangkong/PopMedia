pub mod canvas;
pub mod chat;
pub mod connections;
pub mod http;
pub mod projects;
pub mod settings;

use rusqlite::Connection;
use std::sync::Mutex;

pub use http::HttpClient;

/// State wrapper for database connection and shared resources
#[allow(dead_code)]
pub struct AppState {
    pub db: Mutex<Connection>,
    pub http_client: HttpClient,
}

pub use canvas::*;
pub use chat::*;
pub use connections::*;
pub use projects::*;
pub use settings::*;