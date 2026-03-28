use std::sync::Arc;
use reqwest::Client;

/// Shared HTTP client with connection pooling
pub type HttpClient = Arc<Client>;

/// Create a new HTTP client with sensible defaults
pub fn create_http_client() -> HttpClient {
    Arc::new(
        Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .build()
            .expect("Failed to build HTTP client"),
    )
}

/// Extract content from an LLM response body
/// Supports OpenAI format, 智谱AI (reasoning_content), and streaming (delta.content)
pub fn extract_content_from_response(response_body: &serde_json::Value) -> Option<&str> {
    response_body
        .get("choices")
        .and_then(|c| c.as_array())
        .and_then(|choices| choices.first())
        .and_then(|choice| {
            // Try message.content (OpenAI format)
            choice
                .get("message")
                .and_then(|msg| {
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
        })
}
