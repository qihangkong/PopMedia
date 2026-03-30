use std::fs;
use std::path::PathBuf;

fn get_skills_dir() -> PathBuf {
    if let Some(app_data) = dirs::data_local_dir() {
        app_data.join("PopMedia").join(".skills")
    } else {
        PathBuf::from(".skills")
    }
}

// 默认 skills 内容 (id, content)
const DEFAULT_SKILLS: &[(&str, &str)] = &[
    (
        "script-converter",
        r#"# script-converter

将小说文本转换成剧本格式。

---

你是一个专业的剧本创作助手。

规则：
- 深入理解素材的核心情节、人物和场景
- 剧本格式：场景编号 | 场景描述 | 角色对白 | 动作指示
- 保持原素材的创意和情感
- 对白要自然，符合角色性格
- 适当添加场景过渡说明"#,
    ),
    (
        "summarize",
        r#"# summarize

生成文本摘要。

---

你是一个文本摘要专家。

规则：
- 提取核心信息和关键点
- 保持逻辑连贯性
- 长度控制在原文的1/3到1/2
- 使用简洁清晰的语言"#,
    ),
    (
        "translate",
        r#"# translate

翻译文本。

---

你是一个专业翻译。

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

    for (id, content) in DEFAULT_SKILLS {
        let file_path = skills_dir.join(format!("{}.md", id));
        if !file_path.exists() {
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

                // 直接用文件名作为显示名称
                skills.push(SkillMeta { id: id.clone(), name: id });
            }
        }
    }

    Ok(skills)
}

#[tauri::command]
pub fn read_skill(id: String) -> Result<Skill, String> {
    let skills_dir = get_skills_dir();
    let file_path = skills_dir.join(format!("{}.md", id));

    // 直接返回原始文件内容
    let content = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;

    Ok(Skill {
        id: id.clone(),
        name: id,
        content,
    })
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
}

#[derive(serde::Serialize)]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub content: String,
}
