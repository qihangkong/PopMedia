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

/// LLM Provider type - determines API endpoint and request format
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum LlmProviderType {
    // 普通聊天 API
    #[serde(rename = "openai")]
    OpenAi,
    #[serde(rename = "volcengine")]
    VolcEngine,      // 火山引擎（扣子/Coze）
    #[serde(rename = "baidu")]
    Baidu,           // 百度文心
    #[serde(rename = "alibaba")]
    Alibaba,        // 阿里通义
    #[serde(rename = "zhipu")]
    Zhipu,          // 智谱 AI
    #[serde(rename = "minimax")]
    MiniMax,        // MiniMax

    // Coding 专用 API
    #[serde(rename = "volcengine_coding")]
    VolcEngineCoding,  // 火山引擎 kimi-coder
    #[serde(rename = "alibaba_coding")]
    AlibabaCoding,    // 阿里 qwen-coder

    #[serde(rename = "custom")]
    Custom,          // 自定义（需要手动填 URL）
}

#[allow(dead_code)]
impl LlmProviderType {
    /// Get the default API URL for this provider
    pub fn default_url(&self) -> &'static str {
        match self {
            LlmProviderType::OpenAi => "https://api.openai.com/v1",
            LlmProviderType::VolcEngine => "https://ark.cn-beijing.volces.com/api/paas/v1",
            LlmProviderType::Baidu => "https://qianfan.baidubce.com/v2",
            LlmProviderType::Alibaba => "https://dashscope.aliyuncs.com/api/v1",
            LlmProviderType::Zhipu => "https://open.bigmodel.cn/api/paas/v4",
            LlmProviderType::MiniMax => "https://api.minimax.chat/v1",
            LlmProviderType::VolcEngineCoding => "https://ark.cn-beijing.volces.com/api/coding",
            LlmProviderType::AlibabaCoding => "https://dashscope.aliyuncs.com/api/v1",
            LlmProviderType::Custom => "",
        }
    }

    /// Get the chat completions endpoint
    pub fn chat_endpoint(&self) -> &'static str {
        match self {
            LlmProviderType::OpenAi => "/chat/completions",
            LlmProviderType::VolcEngine => "/chat/completions",
            LlmProviderType::VolcEngineCoding => "/messages",
            LlmProviderType::Baidu => "/chat/completions",
            LlmProviderType::Alibaba | LlmProviderType::AlibabaCoding => "/services/aigc/text-generation/generation",
            LlmProviderType::Zhipu => "/chat/completions",
            LlmProviderType::MiniMax => "/text/chatcompletion_v2",
            LlmProviderType::Custom => "/chat/completions",
        }
    }

    /// Check if this provider uses Baidu's special auth (ACE)
    pub fn is_baidu(&self) -> bool {
        matches!(self, LlmProviderType::Baidu)
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LlmConfig {
    pub id: String,
    pub name: String,
    pub provider_type: LlmProviderType,
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

#[derive(Debug, Serialize, Deserialize)]
pub struct TestConnectionResult {
    pub logs: Vec<String>,
    pub success: bool,
    pub message: String,
    /// Whether the API supports tool calling (function calling)
    #[serde(default)]
    pub tool_call_support: Option<bool>,
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