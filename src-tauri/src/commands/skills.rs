use std::fs;
use std::path::PathBuf;

fn get_skills_dir() -> PathBuf {
    if let Some(app_data) = dirs::data_local_dir() {
        app_data.join("PopMedia").join(".skills")
    } else {
        PathBuf::from(".skills")
    }
}

// Claude Code standard skill format:
// ---
// name: skill-name
// description: What the skill does
// ---
// # Skill body
// Instructions...
const DEFAULT_SKILLS: &[(&str, &str)] = &[
    (
        "script-converter",
        r#"---
name: script-converter
description: 将小说或故事文本转换成剧本格式输出
---

# 剧本转换

你是一个专业的剧本创作助手。

## 输入
用户的原始文本（小说片段、故事大纲等）

## 输出
标准剧本格式，包含：
- 场景编号（如 SCENE 1）
- 场景描述（内景/外景、时间、地点）
- 角色对白（角色名: 对白内容）
- 动作指示（可选，用括号标注）

## 规则
1. 深入理解素材的核心情节、人物性格和场景
2. 剧本格式必须统一：场景编号 | 场景描述 | 角色对白 | 动作指示
3. 保持原素材的创意和情感表达
4. 对白要自然，符合角色性格
5. 适当添加场景过渡说明

## 示例输出格式
```
SCENE 1
内景 · 咖啡馆 · 白天

角色A：(推门进来)
角色B：嘿，这边！

[角色A走向角色B的桌子]
角色A：好久不见。
```"#,
    ),
    (
        "summarize",
        r#"---
name: summarize
description: 对文本生成简洁准确的摘要
---

# 文本摘要

你是一个文本摘要专家。

## 输入
用户提供的任意文本（文章、段落、对话等）

## 输出
简洁、准确的摘要内容

## 规则
1. 提取核心信息和关键点
2. 保持原文的逻辑连贯性
3. 长度控制在原文的 1/3 到 1/2
4. 使用简洁清晰的语言
5. 不添加个人解释或评论
6. 保留重要的数据和事实

## 输出格式
直接输出摘要内容，不需要额外说明"#,
    ),
    (
        "translate",
        r#"---
name: translate
description: 将文本翻译成目标语言
---

# 翻译

你是一个专业翻译。

## 输入
用户的原始文本

## 规则
1. 准确理解原文含义
2. 保持原文的风格和语气
3. 符合目标语言的表达习惯
4. 专业术语准确翻译
5. 译文流畅自然
6. 适当调整句式以适应目标语言

## 可翻译语言
- 中文 ↔ 英文
- 中文 ↔ 日文
- 中文 ↔ 韩文
- 其他语言可按需扩展

## 输出格式
直接输出翻译结果，不需要额外说明"#,
    ),
];

pub fn init_default_skills() -> Result<(), String> {
    let skills_dir = get_skills_dir();
    fs::create_dir_all(&skills_dir).map_err(|e| e.to_string())?;

    for (id, content) in DEFAULT_SKILLS {
        let file_path = skills_dir.join(format!("{}.md", id));

        // 检查是否需要迁移（文件不存在 或 使用旧格式）
        let needs_migration = if !file_path.exists() {
            true
        } else {
            // 读取现有文件检查格式
            if let Ok(existing) = fs::read_to_string(&file_path) {
                !existing.starts_with("---")  // 旧格式以 # 开头，新格式以 --- 开头
            } else {
                true
            }
        };

        if needs_migration {
            fs::write(&file_path, content).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

/// 解析 YAML frontmatter
fn parse_frontmatter(content: &str) -> Result<(serde_yaml::Value, String), String> {
    if !content.starts_with("---") {
        return Err("Missing YAML frontmatter".to_string());
    }

    let rest = &content[3..];
    let end_idx = rest.find("---").ok_or("Missing closing ---")?;
    let yaml_str = &rest[..end_idx];
    let body = rest[end_idx + 3..].trim();

    let frontmatter: serde_yaml::Value = serde_yaml::from_str(yaml_str)
        .map_err(|e| format!("YAML parse error: {}", e))?;

    Ok((frontmatter, body.to_string()))
}

/// 加载 Level 1: name + description (用于启动时)
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

                let (frontmatter, _) = parse_frontmatter(&content).unwrap_or_else(|_| {
                    // 兼容旧格式
                    (
                        serde_yaml::Value::String(id.clone()),
                        String::new(),
                    )
                });

                let name = frontmatter.get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or(&id)
                    .to_string();

                let description = frontmatter.get("description")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                skills.push(SkillMeta { id, name, description });
            }
        }
    }

    Ok(skills)
}

/// 加载 Level 2: 完整技能内容 (name + description + instructions)
#[tauri::command]
pub fn read_skill(id: String) -> Result<Skill, String> {
    let skills_dir = get_skills_dir();
    let file_path = skills_dir.join(format!("{}.md", id));

    let content = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;

    let (frontmatter, body) = parse_frontmatter(&content).map_err(|e| e.to_string())?;

    let name = frontmatter.get("name")
        .and_then(|v| v.as_str())
        .unwrap_or(&id)
        .to_string();

    let description = frontmatter.get("description")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    Ok(Skill {
        id,
        name,
        description,
        body,
        needs_upstream: false,
    })
}

/// 读取 skill 原始文件内容（包含 YAML frontmatter）
#[tauri::command]
#[allow(dead_code)]
pub fn read_skill_raw(id: String) -> Result<String, String> {
    let skills_dir = get_skills_dir();
    let file_path = skills_dir.join(format!("{}.md", id));

    fs::read_to_string(&file_path).map_err(|e| e.to_string())
}

/// 加载 Level 3: 技能引用的文件 (references/, scripts/)
/// level: "references" | "scripts"
#[tauri::command]
#[allow(dead_code)]
pub fn load_skill_reference(id: String, level: String) -> Result<Vec<SkillReference>, String> {
    let skills_dir = get_skills_dir();
    let ref_dir = skills_dir.join(&id).join(&level);

    let mut references = Vec::new();

    if ref_dir.exists() {
        for entry in fs::read_dir(&ref_dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();

            if path.is_file() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
                    references.push(SkillReference {
                        name: name.to_string(),
                        content,
                    });
                }
            }
        }
    }

    Ok(references)
}

#[tauri::command]
pub fn save_skill(id: String, content: String) -> Result<(), String> {
    let skills_dir = get_skills_dir();
    fs::create_dir_all(&skills_dir).map_err(|e| e.to_string())?;

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
    pub body: String,
    pub needs_upstream: bool,
}

#[derive(serde::Serialize)]
#[allow(dead_code)]
pub struct SkillReference {
    pub name: String,
    pub content: String,
}
