use std::fs;
use std::path::PathBuf;

fn get_skills_dir() -> PathBuf {
    if let Some(app_data) = dirs::data_local_dir() {
        app_data.join("PopMedia").join(".skills")
    } else {
        PathBuf::from(".skills")
    }
}

// 默认 skills 内容 (id, description, prompt)
const DEFAULT_SKILLS: &[(&str, &str, &str)] = &[
    (
        "script-converter",
        "将小说文本转换成剧本格式",
        r#"你是一个专业的剧本创作助手。

规则：
- 深入理解素材的核心情节、人物和场景
- 剧本格式：场景编号 | 场景描述 | 角色对白 | 动作指示
- 保持原素材的创意和情感
- 对白要自然，符合角色性格
- 适当添加场景过渡说明"#,
    ),
    (
        "summarize",
        "生成文本摘要",
        r#"你是一个文本摘要专家。

规则：
- 提取核心信息和关键点
- 保持逻辑连贯性
- 长度控制在原文的1/3到1/2
- 使用简洁清晰的语言"#,
    ),
    (
        "translate",
        "翻译文本",
        r#"你是一个专业翻译。

规则：
- 保持原文风格和语气
- 符合目标语言的表达习惯
- 专业术语准确翻译
- 译文流畅自然"#,
    ),
];

pub fn init_default_skills() -> Result<(), String> {
    let skills_dir = get_skills_dir();
    fs::create_dir_all(&skills_dir).map_err(|e| e.to_string())?;

    for (id, description, prompt) in DEFAULT_SKILLS {
        let file_path = skills_dir.join(format!("{}.md", id));
        if !file_path.exists() {
            let content = format!(
                "---\nname: {}\ndescription: {}\n---\n\n{}",
                id, description, prompt
            );
            fs::write(&file_path, content).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn list_skills() -> Result<Vec<SkillMeta>, String> {
    let skills_dir = get_skills_dir();
    let mut skills = Vec::new();

    if skills_dir.exists() {
        for entry in fs::read_dir(&skills_dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();

            if path.extension().map(|e| e == "md").unwrap_or(false) {
                let id = path.file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("")
                    .to_string();

                let content = fs::read_to_string(&path).unwrap_or_default();
                let (name, description) = parse_frontmatter(&content);

                skills.push(SkillMeta { id, name, description });
            }
        }
    }

    Ok(skills)
}

#[tauri::command]
pub fn read_skill(id: String) -> Result<Skill, String> {
    let skills_dir = get_skills_dir();
    let file_path = skills_dir.join(format!("{}.md", id));

    let content = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;

    let (name, description) = parse_frontmatter(&content);
    let system_prompt = extract_skill_content(&content);

    Ok(Skill {
        id,
        name,
        description,
        system_prompt,
        needs_upstream: true,
    })
}

#[tauri::command]
pub fn save_skill(id: String, name: String, description: String, system_prompt: String) -> Result<(), String> {
    let skills_dir = get_skills_dir();
    fs::create_dir_all(&skills_dir).map_err(|e| e.to_string())?;

    let content = format!(
        "---\nname: {}\ndescription: {}\n---\n\n{}",
        name, description, system_prompt
    );
    let file_path = skills_dir.join(format!("{}.md", id));

    fs::write(&file_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_skill(id: String) -> Result<(), String> {
    let skills_dir = get_skills_dir();
    let file_path = skills_dir.join(format!("{}.md", id));

    if file_path.exists() {
        fs::remove_file(&file_path).map_err(|e| e.to_string())
    } else {
        Ok(())
    }
}

// 解析 YAML frontmatter
// 格式：
// ---
// name: xxx
// description: xxx
// ---
//
// content
fn parse_frontmatter(content: &str) -> (String, String) {
    let mut name = String::new();
    let mut description = String::new();

    let mut in_frontmatter = false;

    for line in content.lines() {
        if line.trim() == "---" {
            in_frontmatter = !in_frontmatter;
            continue;
        }

        if in_frontmatter {
            if let Some(rest) = line.strip_prefix("name:") {
                name = rest.trim().to_string();
            } else if let Some(rest) = line.strip_prefix("description:") {
                description = rest.trim().to_string();
            }
        }
    }

    if name.is_empty() {
        name = "未命名".to_string();
    }
    if description.is_empty() {
        description = "无描述".to_string();
    }

    (name, description)
}

// 提取 frontmatter 之后的内容作为 system prompt
fn extract_skill_content(content: &str) -> String {
    let mut found_end = false;
    let mut result = Vec::new();
    let mut started = false;

    for line in content.lines() {
        if line.trim() == "---" {
            if !found_end {
                found_end = true;
                continue;
            } else {
                started = true;
                continue;
            }
        }

        if found_end && started {
            result.push(line);
        } else if found_end && !started {
            // 跳过 frontmatter 后到第一个空行之间的内容
            if !line.trim().is_empty() {
                result.push(line);
                started = true;
            }
        }
    }

    result.join("\n").trim().to_string()
}

#[derive(serde::Serialize)]
pub struct SkillMeta {
    pub id: String,
    pub name: String,
    pub description: String,
}

#[derive(serde::Serialize)]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub description: String,
    pub system_prompt: String,
    pub needs_upstream: bool,
}
