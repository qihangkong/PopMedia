use crate::commands::http::extract_content_from_response;
use crate::commands::http::extract_tool_calls_from_response;
use crate::commands::AppState;
use crate::models::LlmConfig;
use chrono::Local;
use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;

/// Tool call from LLM
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ToolCall {
    pub id: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub function: FunctionInfo,
}

/// Function info inside tool call
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FunctionInfo {
    pub name: String,
    pub arguments: serde_json::Value,
}

/// Response from LLM that may contain tool_calls
#[derive(Debug, Serialize, Deserialize)]
pub struct LlmResponse {
    pub content: Option<String>,
    pub tool_calls: Option<Vec<ToolCall>>,
    pub error: Option<String>,
}

/// Sanitize a string to be safe for use in file names
fn sanitize_filename(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            c if c.is_control() => '_',
            c => c,
        })
        .collect()
}

/// Log AI dialogue to a per-session file
/// The log file is named by session_id only, so all entries for the same session go to the same file.
/// Each entry is marked with timestamp and a round number to distinguish different turns.
fn log_ai_dialogue(
    canvas: &str,
    node: &str,
    sid: &str,
    raw_request: &str,
    raw_response: &str,
    mode_label: &str,
    round: Option<usize>, // Round number for agentic multi-turn, starts from 1
) {
    let log_dir = dirs::data_local_dir()
        .map(|p| p.join("PopMedia").join("logs").join("ai_dialogue"))
        .unwrap_or_else(|| PathBuf::from("logs").join("ai_dialogue"));

    if let Err(e) = fs::create_dir_all(&log_dir) {
        log::warn!("Failed to create log directory: {}", e);
        return;
    }

    let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S");
    let sanitized_canvas = sanitize_filename(canvas);
    let sanitized_node = sanitize_filename(node);

    // Use session_id only as filename to aggregate all entries for the same session
    let log_file = log_dir.join(format!(
        "{}_{}_{}.log",
        sanitized_canvas, sanitized_node, sid
    ));

    // Check if file exists to determine if this is a new session
    let is_new_session = !log_file.exists();

    // Add session header for new files
    let mut entry = String::new();

    if is_new_session {
        entry.push_str(&format!(
            "========== AI Dialogue Session ==========\n\
             Canvas: {}\n\
             Node: {}\n\
             Session: {}\n\
             Created: {}\n\
             =========================================\n\n",
            canvas,
            node,
            sid,
            timestamp
        ));
    }

    // Round marker for agentic mode
    if let Some(r) = round {
        entry.push_str(&format!(
            "[{}] Round #{} starts\n",
            timestamp, r
        ));
    } else {
        entry.push_str(&format!(
            "[{}]\n",
            timestamp
        ));
    }

    entry.push_str(&format!(
        "========== AI Dialogue {} ==========\n\
         --------------------------------\n\
         [Raw Request]\n{}\n\
         --------------------------------\n\
         [Raw Response]\n{}",
        mode_label,
        raw_request,
        raw_response
    ));

    entry.push_str("\n\
         ========== End ==========\n\n");

    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&log_file) {
        if let Err(e) = file.write_all(entry.as_bytes()) {
            log::warn!("Failed to write AI dialogue log: {}", e);
        }
    }
}

/// Validate LLM config and return the sanitized API URL
fn validate_llm_config(config: &LlmConfig) -> Result<String, String> {
    if config.api_url.is_empty() {
        log::error!("API URL 为空");
        return Err("API URL is required".to_string());
    }

    if config.api_key.is_empty() {
        log::error!("API Key 为空");
        return Err("API Key is required".to_string());
    }

    Ok(config.api_url.trim_end_matches('/').to_string())
}

/// Tool definition for the request (OpenAI-compatible format)
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ToolDefinition {
    #[serde(rename = "type", default)]
    pub type_: Option<String>,
    pub function: FunctionDefinition,
}

/// Function definition inside tool
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FunctionDefinition {
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
}

/// Send a chat message to the LLM and get a response
#[tauri::command]
pub async fn send_chat_message(
    config: LlmConfig,
    message: String,
    state: tauri::State<'_, AppState>,
    canvas_name: Option<String>,
    node_name: Option<String>,
    session_id: Option<String>,
) -> Result<String, String> {
    // Simple single-turn mode: just return text content
    let http_client = state.http_client.clone();
    log::info!("发送聊天消息到 LLM: {}", config.name);

    // Validate config and get sanitized API URL
    let api_url = match validate_llm_config(&config) {
        Ok(url) => url,
        Err(e) => return Err(e),
    };

    let model_name = if config.model_name.is_empty() {
        "gpt-3.5-turbo"
    } else {
        &config.model_name
    };

    let request_body = serde_json::json!({
        "model": model_name,
        "messages": [
            {"role": "user", "content": message}
        ],
        "max_tokens": 65536,
        "temperature": 0.7
    });

    let raw_request = serde_json::to_string_pretty(&request_body).unwrap_or_default();

    log::info!("发送请求到 {}/chat/completions", api_url);

    let response = http_client
        .post(&format!("{}/chat/completions", api_url))
        .header("Authorization", format!("Bearer {}", config.api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| {
            log::error!("请求失败: {}", e);
            format!("请求失败: {}", e)
        })?;

    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.map_err(|e| {
            log::error!("读取响应体失败: {}", e);
            format!("读取响应体失败: {}", e)
        })?;
        log::error!("API 响应错误, 状态码: {}, body: {}", status, body);
        return Err(format!("API 响应错误 ({}): {}", status, body));
    }

    let response_body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| {
            log::error!("解析响应 JSON 失败: {}", e);
            format!("解析响应失败: {}", e)
        })?;

    let raw_response = serde_json::to_string_pretty(&response_body).unwrap_or_default();

    log::info!("收到响应: {}", response_body);

    // Log AI dialogue to a per-session file
    if let (Some(canvas), Some(node), Some(sid)) = (&canvas_name, &node_name, &session_id) {
        log_ai_dialogue(
            canvas,
            node,
            sid,
            &raw_request,
            &raw_response,
            "",
            None, // single-turn mode, no round tracking
        );
    }

    if let Some(text) = extract_content_from_response(&response_body) {
        if !text.is_empty() {
            log::info!("成功收到 AI 回复");
            return Ok(text.to_string());
        }
    }

    log::error!("响应格式无效, 缺少 content 字段");
    Err("API 响应格式无效".to_string())
}

/// Send a chat message with tools support (Agentic multi-turn mode)
#[tauri::command]
pub async fn send_chat_message_with_tools(
    config: LlmConfig,
    messages: Vec<serde_json::Value>,
    tools: Vec<ToolDefinition>,
    state: tauri::State<'_, AppState>,
    canvas_name: Option<String>,
    node_name: Option<String>,
    session_id: Option<String>,
    round: Option<usize>, // Round number for agentic multi-turn logging
) -> Result<LlmResponse, String> {
    let http_client = state.http_client.clone();
    log::info!("发送带工具的聊天消息到 LLM: {}", config.name);

    // Validate config and get sanitized API URL
    let api_url = match validate_llm_config(&config) {
        Ok(url) => url,
        Err(e) => return Err(e),
    };

    let model_name = if config.model_name.is_empty() {
        "gpt-3.5-turbo"
    } else {
        &config.model_name
    };

    // Build request body with optional tools
    let mut request_body = serde_json::json!({
        "model": model_name,
        "messages": messages,
        "max_tokens": 65536,
        "temperature": 0.7
    });

    // Add tools if provided (manually serialize to ensure "type" field is correct)
    if !tools.is_empty() {
        let tools_json: Vec<serde_json::Value> = tools
            .into_iter()
            .map(|t| {
                serde_json::json!({
                    "type": "function",
                    "function": {
                        "name": t.function.name,
                        "description": t.function.description,
                        "parameters": t.function.parameters,
                    }
                })
            })
            .collect();
        request_body["tools"] = serde_json::json!(tools_json);
    }

    let raw_request = serde_json::to_string_pretty(&request_body).unwrap_or_default();

    log::info!("发送请求到 {}/chat/completions", api_url);
    log::info!("Request body: {}", raw_request);

    let response = http_client
        .post(&format!("{}/chat/completions", api_url))
        .header("Authorization", format!("Bearer {}", config.api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| {
            log::error!("请求失败: {}", e);
            format!("请求失败: {}", e)
        })?;

    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.map_err(|e| {
            log::error!("读取响应体失败: {}", e);
            format!("读取响应体失败: {}", e)
        })?;
        log::error!("API 响应错误, 状态码: {}, body: {}", status, body);
        return Err(format!("API 响应错误 ({}): {}", status, body));
    }

    let response_body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| {
            log::error!("解析响应 JSON 失败: {}", e);
            format!("解析响应失败: {}", e)
        })?;

    let raw_response = serde_json::to_string_pretty(&response_body).unwrap_or_default();

    log::info!("收到响应: {}", response_body);

    // Log AI dialogue
    if let (Some(canvas), Some(node), Some(sid)) = (&canvas_name, &node_name, &session_id) {
        log_ai_dialogue(
            canvas,
            node,
            sid,
            &raw_request,
            &raw_response,
            "(Tool Mode)",
            round,
        );
    }

    // Extract content and tool_calls
    let content = extract_content_from_response(&response_body)
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string());

    let tool_calls = extract_tool_calls_from_response(&response_body).map(|tc_list| {
        tc_list
            .into_iter()
            .filter_map(|tc| {
                // OpenAI format: tool_calls[].id, tool_calls[].type, tool_calls[].function.name, tool_calls[].function.arguments
                let id = tc.get("id")?.as_str()?.to_owned();
                let type_ = tc.get("type")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_owned())
                    .unwrap_or_else(|| "function".to_owned());
                let function_obj = tc.get("function")?;
                let name = function_obj.get("name")?.as_str()?.to_owned();
                let arguments = function_obj.get("arguments")?.clone();
                Some(ToolCall {
                    id,
                    type_,
                    function: FunctionInfo { name, arguments }
                })
            })
            .collect()
    });

    log::info!(
        "成功收到 AI 回复 - content: {}, tool_calls: {:?}",
        content.is_some(),
        tool_calls.as_ref().map(|tc: &Vec<ToolCall>| tc.len())
    );

    Ok(LlmResponse {
        content,
        tool_calls,
        error: None,
    })
}

/// Log tool execution to the same session log file
#[tauri::command]
pub async fn log_tool_execution(
    canvas_name: Option<String>,
    node_name: Option<String>,
    session_id: Option<String>,
    tool_name: String,
    tool_args: String,
    tool_result: String,
) -> Result<(), String> {
    let (Some(canvas), Some(node), Some(sid)) = (&canvas_name, &node_name, &session_id) else {
        return Ok(()); // Skip logging if session info not provided
    };

    let log_dir = dirs::data_local_dir()
        .map(|p| p.join("PopMedia").join("logs").join("ai_dialogue"))
        .unwrap_or_else(|| PathBuf::from("logs").join("ai_dialogue"));

    if let Err(e) = fs::create_dir_all(&log_dir) {
        log::warn!("Failed to create log directory: {}", e);
        return Ok(());
    }

    let sanitized_canvas = sanitize_filename(canvas);
    let sanitized_node = sanitize_filename(node);

    let log_file = log_dir.join(format!(
        "{}_{}_{}.log",
        sanitized_canvas, sanitized_node, sid
    ));

    let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S");

    let entry = format!(
        "[{}] Tool Executed\n\
         --------- Tool: {} ---------\n\
         Args: {}\n\
         Result: {}\n\
         ==============================\n\n",
        timestamp, tool_name, tool_args, tool_result
    );

    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&log_file) {
        if let Err(e) = file.write_all(entry.as_bytes()) {
            log::warn!("Failed to write tool execution log: {}", e);
        }
    }

    Ok(())
}
