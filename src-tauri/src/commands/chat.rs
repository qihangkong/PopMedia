use crate::commands::http::extract_content_from_response;
use crate::commands::AppState;
use crate::models::LlmConfig;
use chrono::Local;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;

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
    let http_client = state.http_client.clone();
    log::info!("发送聊天消息到 LLM: {}", config.name);

    if config.api_url.is_empty() {
        log::error!("API URL 为空");
        return Err("API URL is required".to_string());
    }

    if config.api_key.is_empty() {
        log::error!("API Key 为空");
        return Err("API Key is required".to_string());
    }

    let api_url = config.api_url.trim_end_matches('/');

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
        "max_tokens": 2000,
        "temperature": 0.7
    });

    let raw_request = request_body.to_string();

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

    let raw_response = response_body.to_string();

    log::info!("收到响应: {}", response_body);

    // Log AI dialogue to a per-session file if canvas_name, node_name, and session_id are provided
    if let (Some(canvas), Some(node), Some(sid)) = (&canvas_name, &node_name, &session_id) {
        let log_dir = dirs::data_local_dir()
            .map(|p| p.join("PopMedia").join("logs").join("ai_dialogue"))
            .unwrap_or_else(|| PathBuf::from("logs").join("ai_dialogue"));

        let _ = fs::create_dir_all(&log_dir);

        let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S");
        let sanitized_canvas = sanitize_filename(canvas);
        let sanitized_node = sanitize_filename(node);

        // Create a unique file name: {YYYYMMDD}_{HHmmss}_{canvas}_{node}_{sessionId}.log
        let file_time = Local::now().format("%Y%m%d_%H%M%S");
        let log_file = log_dir.join(format!(
            "{}_{}_{}_{}.log",
            file_time, sanitized_canvas, sanitized_node, sid
        ));

        let entry = format!(
            "[{}]\n\
             ========== AI Dialogue ==========\n\
             Canvas: {}\n\
             Node: {}\n\
             Session: {}\n\
             --------------------------------\n\
             [User Input]\n{}\n\
             --------------------------------\n\
             [Raw Request]\n{}\n\
             --------------------------------\n\
             [Raw Response]\n{}\n\
             ========== End ==========\n\n",
            timestamp, canvas, node, sid, message, raw_request, raw_response
        );

        if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&log_file) {
            let _ = file.write_all(entry.as_bytes());
        }
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
