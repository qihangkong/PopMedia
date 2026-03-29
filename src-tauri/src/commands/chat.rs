use crate::commands::http::extract_content_from_response;
use crate::commands::AppState;
use crate::models::LlmConfig;

/// Send a chat message to the LLM and get a response
#[tauri::command]
pub async fn send_chat_message(
    config: LlmConfig,
    message: String,
    state: tauri::State<'_, AppState>,
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

    log::info!("收到响应: {}", response_body);

    if let Some(text) = extract_content_from_response(&response_body) {
        if !text.is_empty() {
            log::info!("成功收到 AI 回复");
            return Ok(text.to_string());
        }
    }

    log::error!("响应格式无效, 缺少 content 字段");
    Err("API 响应格式无效".to_string())
}
