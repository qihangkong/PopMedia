use crate::commands::http::extract_content_from_response;
use crate::commands::http::extract_tool_calls_from_response;
use crate::commands::AppState;
use crate::models::{ComfyuiConfig, LlmConfig, LlmProviderType, TestConnectionResult};

/// Test LLM API connection
#[tauri::command]
pub async fn test_llm_connection(
    config: LlmConfig,
    state: tauri::State<'_, AppState>,
) -> Result<TestConnectionResult, String> {
    let mut logs = Vec::new();
    let mut log = |msg: &str| {
        log::info!("{}", msg);
        logs.push(msg.to_string());
    };

    log(&format!("开始测试 LLM 连接: {}", config.name));
    log(&format!("Provider: {:?}", config.provider_type));
    log(&format!("API URL: {}", config.api_url));
    log(&format!("Model: {}", config.model_name));

    if config.api_url.is_empty() {
        log("API URL 为空");
        return Ok(TestConnectionResult {
            logs,
            success: false,
            message: "API URL 为空".to_string(),
            tool_call_support: None,
        });
    }

    if config.api_key.is_empty() {
        log("API Key 为空");
        return Ok(TestConnectionResult {
            logs,
            success: false,
            message: "API Key 为空".to_string(),
            tool_call_support: None,
        });
    }

    let model_name = if config.model_name.is_empty() {
        log("model_name 为空, 使用默认模型名");
        "unknown"
    } else {
        &config.model_name
    };

    // Build request body based on provider type
    let (request_body, endpoint) = build_chat_request(&config.provider_type, model_name, &mut log);

    let full_url = format!("{}{}", config.api_url.trim_end_matches('/'), endpoint);
    log(&format!("请求 URL: {}", full_url));
    log(&format!("请求体: {}", request_body));

    // Build request based on provider
    let request = state.http_client
        .post(&full_url)
        .header("Authorization", format!("Bearer {}", config.api_key))
        .header("Content-Type", "application/json")
        .json(&request_body);

    let response = request
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| {
            log(&format!("请求失败: {}", e));
            format!("请求失败: {}", e)
        })?;

    let status = response.status();
    log(&format!("收到响应, 状态码: {}", status));

    if !status.is_success() {
        let body = response.text().await.map_err(|e| {
            log(&format!("读取响应体失败: {}", e));
            format!("读取响应体失败: {}", e)
        })?;
        log(&format!("响应错误, 状态码: {}, body: {}", status, body));
        return Ok(TestConnectionResult {
            logs,
            success: false,
            message: format!("API 响应错误 ({}): {}", status, body),
            tool_call_support: None,
        });
    }

    // Parse response
    let response_body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| {
            log(&format!("解析响应 JSON 失败: {}", e));
            format!("解析响应失败: {}", e)
        })?;

    log(&format!("响应体: {}", response_body));

    // Extract content based on provider type
    let text = extract_content_by_provider(&config.provider_type, &response_body);

    if let Some(text) = text {
        if !text.is_empty() {
            log(&format!("基础聊天测试成功! AI 回复: {}", text));
            // Now test tool calling support
            let tool_call_support = test_tool_calling_support(&state, &config, model_name, &mut log).await;
            return Ok(TestConnectionResult {
                logs,
                success: true,
                message: if tool_call_support {
                    format!("连接成功! AI 回复: {} | Tool Calling: 支持", text)
                } else {
                    format!("连接成功! AI 回复: {} | Tool Calling: 不支持", text)
                },
                tool_call_support: Some(tool_call_support),
            });
        }
    }

    log("响应格式无效, 缺少 content 字段");
    Ok(TestConnectionResult {
        logs,
        success: false,
        message: "API 响应格式无效".to_string(),
        tool_call_support: None,
    })
}

/// Test if the LLM API supports tool calling (function calling)
async fn test_tool_calling_support(
    state: &tauri::State<'_, AppState>,
    config: &LlmConfig,
    model_name: &str,
    log: &mut impl FnMut(&str),
) -> bool {
    log("========== 测试 Tool Calling 支持 ==========");

    // Build a request with a simple weather tool
    let (request_body, endpoint) = build_chat_request_with_tools(&config.provider_type, model_name);

    let full_url = format!("{}{}", config.api_url.trim_end_matches('/'), endpoint);
    log(&format!("Tool Calling 请求 URL: {}", full_url));

    let request = state.http_client
        .post(&full_url)
        .header("Authorization", format!("Bearer {}", config.api_key))
        .header("Content-Type", "application/json")
        .json(&request_body);

    match request.timeout(std::time::Duration::from_secs(30)).send().await {
        Ok(response) => {
            let status = response.status();
            log(&format!("Tool Calling 响应状态码: {}", status));

            if !status.is_success() {
                log(&format!("Tool Calling 请求失败, 状态码: {}", status));
                return false;
            }

            match response.json::<serde_json::Value>().await {
                Ok(response_body) => {
                    log(&format!("Tool Calling 响应体: {}", response_body));

                    // Check if response contains tool_calls
                    if let Some(tool_calls) = extract_tool_calls_from_response(&response_body) {
                        if !tool_calls.is_empty() {
                            log(&format!("检测到 Tool Calls: {:?}", tool_calls));
                            return true;
                        }
                    }

                    // Also check for Anthropic-style tool use in content blocks
                    if let Some(content) = response_body.get("content").and_then(|c| c.as_array()) {
                        for item in content {
                            if item.get("type").and_then(|t| t.as_str()) == Some("tool_use") {
                                log("检测到 Anthropic 风格的 tool_use");
                                return true;
                            }
                        }
                    }

                    log("Tool Calling 响应中未检测到 tool_calls");
                    false
                }
                Err(e) => {
                    log(&format!("解析 Tool Calling 响应失败: {}", e));
                    false
                }
            }
        }
        Err(e) => {
            log(&format!("Tool Calling 请求失败: {}", e));
            false
        }
    }
}

/// Build chat request body with tools for testing tool calling support
fn build_chat_request_with_tools(
    provider: &LlmProviderType,
    model_name: &str,
) -> (serde_json::Value, &'static str) {
    let test_message = "请帮我查询北京的天气，使用 get_weather 工具";

    // Define a simple weather tool
    let tools = serde_json::json!([
        {
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "获取指定城市的天气信息",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {
                            "type": "string",
                            "description": "城市名称"
                        }
                    },
                    "required": ["location"]
                }
            }
        }
    ]);

    match provider {
        LlmProviderType::Alibaba | LlmProviderType::AlibabaCoding => {
            // 阿里通义
            let body = serde_json::json!({
                "model": model_name,
                "input": {
                    "messages": [
                        {"role": "user", "content": test_message}
                    ]
                },
                "parameters": {
                    "max_tokens": 256,
                    "temperature": 0.7,
                    "tools": tools
                }
            });
            (body, "/services/aigc/text-generation/generation")
        }
        LlmProviderType::VolcEngineCoding => {
            // 火山引擎 Coding - Anthropic 格式
            let body = serde_json::json!({
                "model": model_name,
                "messages": [
                    {"role": "user", "content": test_message}
                ],
                "max_tokens": 256,
                "tools": tools
            });
            (body, "/messages")
        }
        _ => {
            // OpenAI, VolcEngine, Baidu, Zhipu, MiniMax, Custom - 标准格式
            let body = serde_json::json!({
                "model": model_name,
                "messages": [
                    {"role": "user", "content": test_message}
                ],
                "max_tokens": 256,
                "temperature": 0.7,
                "tools": tools
            });
            (body, "/chat/completions")
        }
    }
}

/// Build chat request body based on provider type
#[allow(dead_code)]
fn build_chat_request(
    provider: &LlmProviderType,
    model_name: &str,
    _log: &mut impl FnMut(&str),
) -> (serde_json::Value, &'static str) {
    let test_message = "请直接回复：你好，不需要思考过程";

    match provider {
        LlmProviderType::Alibaba | LlmProviderType::AlibabaCoding => {
            // 阿里通义：使用 parameters 和 model 字段
            let body = serde_json::json!({
                "model": model_name,
                "input": {
                    "messages": [
                        {"role": "user", "content": test_message}
                    ]
                },
                "parameters": {
                    "max_tokens": 256,
                    "temperature": 0.7
                }
            });
            (body, "/services/aigc/text-generation/generation")
        }
        LlmProviderType::Baidu => {
            // 百度文心
            let body = serde_json::json!({
                "model": model_name,
                "messages": [
                    {"role": "user", "content": test_message}
                ],
                "max_tokens": 256,
                "temperature": 0.7
            });
            (body, "/chat/completions")
        }
        LlmProviderType::Zhipu => {
            // 智谱 AI
            let body = serde_json::json!({
                "model": model_name,
                "messages": [
                    {"role": "user", "content": test_message}
                ],
                "max_tokens": 256,
                "temperature": 0.7
            });
            (body, "/chat/completions")
        }
        LlmProviderType::MiniMax => {
            // MiniMax
            let body = serde_json::json!({
                "model": model_name,
                "messages": [
                    {"role": "user", "content": test_message}
                ],
                "max_tokens": 256,
                "temperature": 0.7
            });
            (body, "/text/chatcompletion_v2")
        }
        LlmProviderType::VolcEngineCoding => {
            // 火山引擎 Coding - Anthropic 兼容格式
            let body = serde_json::json!({
                "model": model_name,
                "messages": [
                    {"role": "user", "content": test_message}
                ],
                "max_tokens": 256
            });
            (body, "/messages")
        }
        _ => {
            // OpenAI, VolcEngine, Custom - 标准格式
            let body = serde_json::json!({
                "model": model_name,
                "messages": [
                    {"role": "user", "content": test_message}
                ],
                "max_tokens": 256,
                "temperature": 0.7
            });
            (body, "/chat/completions")
        }
    }
}

/// Extract content from response based on provider type
fn extract_content_by_provider(provider: &LlmProviderType, response: &serde_json::Value) -> Option<String> {
    match provider {
        LlmProviderType::Alibaba | LlmProviderType::AlibabaCoding => {
            // 阿里：output.choices[0].message.content
            response
                .pointer("/output/text")
                .or_else(|| response.pointer("/output/choices/0/message/content"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        }
        LlmProviderType::Baidu => {
            // 百度：choices[0].message.content
            response
                .pointer("/choices/0/message/content")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        }
        LlmProviderType::Zhipu => {
            // 智谱：choices[0].message.content
            response
                .pointer("/choices/0/message/content")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        }
        LlmProviderType::MiniMax => {
            // MiniMax: choices[0].text
            response
                .pointer("/choices/0/text")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        }
        LlmProviderType::VolcEngineCoding => {
            // 火山引擎 Coding - Anthropic 兼容格式: content[0].text
            response
                .pointer("/content/0/text")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        }
        _ => {
            // OpenAI, VolcEngine, Custom: choices[0].message.content
            extract_content_from_response(response).map(|s| s.to_string())
        }
    }
}

/// Test ComfyUI connection
#[tauri::command]
pub async fn test_comfyui_connection(
    config: ComfyuiConfig,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    if config.host.is_empty() {
        return Err("Host is required".to_string());
    }

    let url = format!("http://{}:{}/system_stats", config.host, config.port);

    let response = state.http_client
        .get(&url)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    if response.status().is_success() {
        Ok("Connection successful!".to_string())
    } else {
        let status = response.status();
        let body = response.text().await.map_err(|e| {
            log::error!("读取响应体失败: {}", e);
            format!("读取响应体失败: {}", e)
        })?;
        Err(format!("Connection failed: {} - {}", status, body))
    }
}