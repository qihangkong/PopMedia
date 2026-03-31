#[cfg(test)]
mod tests_http {
    use crate::commands::http::{create_http_client, extract_content_from_response};

    #[test]
    fn test_create_http_client_returns_valid_client() {
        let client = create_http_client();
        // Arc should be valid and shareable
        assert!(std::sync::Arc::strong_count(&client) >= 1);
    }

    #[test]
    fn test_extract_content_openai_format() {
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
    fn test_extract_content_streaming_format() {
        let response = serde_json::json!({
            "choices": [{
                "delta": {
                    "content": "Streaming response"
                }
            }]
        });

        let content = extract_content_from_response(&response);
        assert_eq!(content, Some("Streaming response"));
    }

    #[test]
    fn test_extract_content_reasoning_format() {
        let response = serde_json::json!({
            "choices": [{
                "message": {
                    "reasoning_content": "Reasoning trace"
                }
            }]
        });

        let content = extract_content_from_response(&response);
        assert_eq!(content, Some("Reasoning trace"));
    }

    #[test]
    fn test_extract_content_prefers_content_over_reasoning() {
        let response = serde_json::json!({
            "choices": [{
                "message": {
                    "content": "Actual response",
                    "reasoning_content": "Reasoning trace"
                }
            }]
        });

        let content = extract_content_from_response(&response);
        assert_eq!(content, Some("Actual response"));
    }

    #[test]
    fn test_extract_content_text_field() {
        let response = serde_json::json!({
            "choices": [{
                "text": "Text response"
            }]
        });

        let content = extract_content_from_response(&response);
        assert_eq!(content, Some("Text response"));
    }

    #[test]
    fn test_extract_content_empty_content() {
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
    fn test_extract_content_missing_choices() {
        let response = serde_json::json!({
            "model": "gpt-4"
        });

        let content = extract_content_from_response(&response);
        assert_eq!(content, None);
    }

    #[test]
    fn test_extract_content_empty_choices() {
        let response = serde_json::json!({
            "choices": []
        });

        let content = extract_content_from_response(&response);
        assert_eq!(content, None);
    }

    #[test]
    fn test_extract_content_multiple_choices_takes_first() {
        let response = serde_json::json!({
            "choices": [
                {
                    "message": {
                        "content": "First response"
                    }
                },
                {
                    "message": {
                        "content": "Second response"
                    }
                }
            ]
        });

        let content = extract_content_from_response(&response);
        assert_eq!(content, Some("First response"));
    }

    #[test]
    fn test_extract_content_missing_message() {
        let response = serde_json::json!({
            "choices": [{
                "delta": {}
            }]
        });

        let content = extract_content_from_response(&response);
        assert_eq!(content, None);
    }

    #[test]
    fn test_extract_content_missing_delta_content() {
        let response = serde_json::json!({
            "choices": [{
                "delta": {
                    "role": "assistant"
                }
            }]
        });

        let content = extract_content_from_response(&response);
        assert_eq!(content, None);
    }
}

#[cfg(test)]
mod tests_skills_models {
    use crate::commands::skills::{SkillMeta, Skill, SkillReference};

    #[test]
    fn test_skill_meta_structure() {
        let meta = SkillMeta {
            id: "test".to_string(),
            name: "Test Skill".to_string(),
            description: "A test skill".to_string(),
        };

        assert_eq!(meta.id, "test");
        assert_eq!(meta.name, "Test Skill");
        assert_eq!(meta.description, "A test skill");
    }

    #[test]
    fn test_skill_structure() {
        let skill = Skill {
            id: "test".to_string(),
            name: "Test Skill".to_string(),
            description: "A test skill".to_string(),
            body: "# Body".to_string(),
            needs_upstream: false,
        };

        assert_eq!(skill.id, "test");
        assert_eq!(skill.name, "Test Skill");
        assert_eq!(skill.body, "# Body");
        assert!(!skill.needs_upstream);
    }

    #[test]
    fn test_skill_reference_structure() {
        let reference = SkillReference {
            name: "example.md".to_string(),
            content: "# Example Reference".to_string(),
        };

        assert_eq!(reference.name, "example.md");
        assert_eq!(reference.content, "# Example Reference");
    }
}
