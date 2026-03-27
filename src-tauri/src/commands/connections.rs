use crate::models::ComfyuiConfig;
use crate::models::LlmConfig;

/// Test LLM API connection
#[tauri::command]
pub async fn test_llm_connection(config: LlmConfig) -> Result<String, String> {
    log::info!("开始测试 LLM 连接: {}", config.name);
    log::info!("API URL: {}", config.api_url);
    log::info!("Model: {}", config.model_name);

    if config.api_url.is_empty() {
        log::error!("API URL 为空");
        return Err("API URL is required".to_string());
    }

    let client = reqwest::Client::new();
    let api_url = config.api_url.trim_end_matches('/');
    log::info!("处理后的 API URL: {}/models", api_url);

    // Step 1: Check if /models endpoint is accessible
    log::info!("步骤 1: 检查 /models 端点...");
    let models_response = client
        .get(&format!("{}/models", api_url))
        .header("Authorization", format!("Bearer {}", config.api_key))
        .header("Content-Type", "application/json")
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await;

    let models_response = match models_response {
        Ok(resp) => {
            log::info!("收到 /models 响应, 状态码: {}", resp.status());
            resp
        }
        Err(e) => {
            log::error!("连接 /models 失败: {}", e);
            return Err(format!("连接失败: {}", e));
        }
    };

    if !models_response.status().is_success() {
        let status = models_response.status();
        let body = models_response.text().await.unwrap_or_default();
        log::error!("/models 响应错误, 状态码: {}, body: {}", status, body);
        return Err(format!("API 不可访问 ({}): {}", status, body));
    }

    log::info!("步骤 1 完成: /models 端点可访问");

    // Step 2: Send a test message to verify the API can respond
    let model_name = if config.model_name.is_empty() {
        log::info!("model_name 为空, 使用默认: gpt-3.5-turbo");
        "gpt-3.5-turbo"
    } else {
        &config.model_name
    };

    let request_body = serde_json::json!({
        "model": model_name,
        "messages": [
            {"role": "user", "content": "请直接回复：你好，不需要思考过程"}
        ],
        "max_tokens": 50,
        "temperature": 0.7
    });

    log::info!("步骤 2: 发送测试消息到 /chat/completions...");
    log::debug!("请求体: {}", request_body);

    let chat_response = client
        .post(&format!("{}/chat/completions", api_url))
        .header("Authorization", format!("Bearer {}", config.api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await;

    let chat_response = match chat_response {
        Ok(resp) => {
            log::info!("收到 /chat/completions 响应, 状态码: {}", resp.status());
            resp
        }
        Err(e) => {
            log::error!("请求 /chat/completions 失败: {}", e);
            return Err(format!("API 请求失败: {}", e));
        }
    };

    let status = chat_response.status();
    if !status.is_success() {
        let body = chat_response.text().await.unwrap_or_default();
        log::error!("chat/completions 响应错误, 状态码: {}, body: {}", status, body);
        return Err(format!("API 响应错误 ({}): {}", status, body));
    }

    log::info!("步骤 2 完成: 收到成功响应");

    // Verify we got a valid response with content
    let response_body: serde_json::Value = chat_response
        .json()
        .await
        .map_err(|e| {
            log::error!("解析响应 JSON 失败: {}", e);
            format!("解析响应失败: {}", e)
        })?;

    log::info!("响应体: {}", response_body);

    // Try different response formats (OpenAI, Chinese APIs like 智谱AI)
    let content = response_body
        .get("choices")
        .and_then(|c| c.as_array())
        .and_then(|choices| choices.first())
        .and_then(|choice| {
            // Try message.content (OpenAI format)
            choice
                .get("message")
                .and_then(|msg| {
                    // First try content, then reasoning_content (智谱AI uses this)
                    msg.get("content")
                        .and_then(|c| c.as_str())
                        .filter(|s| !s.is_empty())
                        .or_else(|| {
                            msg.get("reasoning_content")
                                .and_then(|rc| rc.as_str())
                                .filter(|s| !s.is_empty())
                        })
                })
                .or_else(|| {
                    // Try delta.content (streaming format)
                    choice
                        .get("delta")
                        .and_then(|delta| delta.get("content"))
                        .and_then(|c| c.as_str())
                })
                .or_else(|| {
                    // Try text (some Chinese APIs)
                    choice.get("text").and_then(|t| t.as_str())
                })
        });

    if let Some(text) = content {
        if !text.is_empty() {
            log::info!("测试成功! AI 回复: {}", text);
            return Ok(format!("连接成功! API 回复: {}", text));
        }
    }

    log::error!("响应格式无效, 缺少 content 字段");
    Err("API 响应格式无效".to_string())
}

/// Test ComfyUI connection
#[tauri::command]
pub async fn test_comfyui_connection(config: ComfyuiConfig) -> Result<String, String> {
    if config.host.is_empty() {
        return Err("Host is required".to_string());
    }

    let client = reqwest::Client::new();
    let url = format!("http://{}:{}/system_stats", config.host, config.port);

    let response = client
        .get(&url)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    if response.status().is_success() {
        Ok("Connection successful!".to_string())
    } else {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        Err(format!("Connection failed: {} - {}", status, body))
    }
}