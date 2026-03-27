use serde::{Deserialize, Serialize};

// ==================== App Info ====================

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

// ==================== Settings Models ====================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LlmConfig {
    pub id: String,
    pub name: String,
    pub api_url: String,
    pub api_key: String,
    pub model_name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ComfyuiConfig {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: String,
}

// ==================== Canvas Models ====================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CanvasInfo {
    pub id: String,
    pub name: String,
    pub thumbnail: Option<String>,
    pub preview: Option<String>,
    pub project_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CanvasData {
    pub nodes: serde_json::Value,
    pub edges: serde_json::Value,
    pub viewport: Option<serde_json::Value>,
}

// ==================== Project Models ====================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectInfoData {
    pub id: String,
    pub name: String,
    pub thumbnail: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}