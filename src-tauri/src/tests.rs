#[cfg(test)]
mod tests {
    use crate::commands::http::{create_http_client, extract_content_from_response};

    #[test]
    fn test_create_http_client() {
        let client = create_http_client();
        // Arc is always non-null when created successfully
        assert!(std::sync::Arc::strong_count(&client) >= 1);
    }

    #[test]
    fn test_extract_content_from_openai_response() {
        let response = serde_json::json!({
            "choices": [{
                "message": {
                    "content": "Hello, world!"
                }
            }]
        });

        let content = extract_content_from_response(&response);
        assert_eq!(content, Some("Hello, world!"));
    }

    #[test]
    fn test_extract_content_from_streaming_response() {
        let response = serde_json::json!({
            "choices": [{
                "delta": {
                    "content": "Streaming content"
                }
            }]
        });

        let content = extract_content_from_response(&response);
        assert_eq!(content, Some("Streaming content"));
    }

    #[test]
    fn test_extract_content_from_reasoning_response() {
        let response = serde_json::json!({
            "choices": [{
                "message": {
                    "reasoning_content": "Reasoning output"
                }
            }]
        });

        let content = extract_content_from_response(&response);
        assert_eq!(content, Some("Reasoning output"));
    }

    #[test]
    fn test_extract_content_prefers_content_over_reasoning() {
        let response = serde_json::json!({
            "choices": [{
                "message": {
                    "content": "Actual content",
                    "reasoning_content": "Reasoning content"
                }
            }]
        });

        let content = extract_content_from_response(&response);
        assert_eq!(content, Some("Actual content"));
    }

    #[test]
    fn test_extract_content_from_text_field() {
        let response = serde_json::json!({
            "choices": [{
                "text": "Some text content"
            }]
        });

        let content = extract_content_from_response(&response);
        assert_eq!(content, Some("Some text content"));
    }

    #[test]
    fn test_extract_content_returns_none_for_empty_content() {
        let response = serde_json::json!({
            "choices": [{
                "message": {
                    "content": ""
                }
            }]
        });

        let content = extract_content_from_response(&response);
        assert_eq!(content, None);
    }

    #[test]
    fn test_extract_content_returns_none_for_missing_choices() {
        let response = serde_json::json!({
            "model": "gpt-4"
        });

        let content = extract_content_from_response(&response);
        assert_eq!(content, None);
    }

    #[test]
    fn test_extract_content_returns_none_for_empty_choices() {
        let response = serde_json::json!({
            "choices": []
        });

        let content = extract_content_from_response(&response);
        assert_eq!(content, None);
    }
}
