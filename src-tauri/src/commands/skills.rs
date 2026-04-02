use std::fs;
use std::path::PathBuf;
use tauri::Manager;

/// 获取用户 skill 目录（可写）
/// 路径: $LOCALAPPDATA/PopMedia/.skills/
fn get_user_skills_dir() -> PathBuf {
    if let Some(app_data) = dirs::data_local_dir() {
        app_data.join("PopMedia").join(".skills")
    } else {
        PathBuf::from(".skills")
    }
}

/// 获取系统 skill 目录（只读，打包在安装包中）
/// 路径: 安装目录/resources/skills/
fn get_system_skills_dir(app: &tauri::AppHandle) -> Option<PathBuf> {
    app.path().resource_dir().ok().map(|p: PathBuf| p.join("skills"))
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

/// 从文件加载 skill 元信息
fn load_skill_meta_from_file(path: &PathBuf) -> Option<SkillMeta> {
    let content = fs::read_to_string(path).ok()?;
    let id = path.file_stem()?.to_str()?.to_string();

    let (frontmatter, _) = parse_frontmatter(&content).unwrap_or_else(|_| {
        (serde_yaml::Value::String(id.clone()), String::new())
    });

    let name = frontmatter.get("name")
        .and_then(|v| v.as_str())
        .unwrap_or(&id)
        .to_string();

    let description = frontmatter.get("description")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    Some(SkillMeta { id, name, description })
}

/// 从文件加载完整 skill
fn load_skill_from_file(path: &PathBuf) -> Option<Skill> {
    let content = fs::read_to_string(path).ok()?;
    let id = path.file_stem()?.to_str()?.to_string();

    let (frontmatter, body) = parse_frontmatter(&content).ok()?;

    let name = frontmatter.get("name")
        .and_then(|v| v.as_str())
        .unwrap_or(&id)
        .to_string();

    let description = frontmatter.get("description")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    Some(Skill {
        id,
        name,
        description,
        body,
        needs_upstream: false,
    })
}

/// 列出目录下的所有 .md 文件
fn list_skill_files(dir: &PathBuf) -> Vec<PathBuf> {
    if !dir.exists() {
        return Vec::new();
    }

    fs::read_dir(dir)
        .ok()
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .map(|e| e.path())
                .filter(|p| p.extension().map(|e| e == "md").unwrap_or(false))
                .collect()
        })
        .unwrap_or_default()
}

/// 加载 Level 1: name + description
#[tauri::command]
pub fn list_skills(app: tauri::AppHandle) -> Result<Vec<SkillMeta>, String> {
    let mut skills_map: std::collections::HashMap<String, SkillMeta> = std::collections::HashMap::new();

    // 先加载系统 skill（只读）
    if let Some(system_dir) = get_system_skills_dir(&app) {
        for file_path in list_skill_files(&system_dir) {
            if let Some(meta) = load_skill_meta_from_file(&file_path) {
                skills_map.insert(meta.id.clone(), meta);
            }
        }
    }

    // 再加载用户 skill（可覆盖系统 skill）
    let user_dir = get_user_skills_dir();
    for file_path in list_skill_files(&user_dir) {
        if let Some(meta) = load_skill_meta_from_file(&file_path) {
            skills_map.insert(meta.id.clone(), meta);
        }
    }

    Ok(skills_map.into_values().collect())
}

/// 加载 Level 2: 完整技能内容
#[tauri::command]
pub fn read_skill(app: tauri::AppHandle, id: String) -> Result<Skill, String> {
    // 先检查用户 skill
    let user_path = get_user_skills_dir().join(format!("{}.md", id));
    if user_path.exists() {
        if let Some(skill) = load_skill_from_file(&user_path) {
            return Ok(skill);
        }
    }

    // 再检查系统 skill
    if let Some(system_dir) = get_system_skills_dir(&app) {
        let system_path = system_dir.join(format!("{}.md", id));
        if system_path.exists() {
            if let Some(skill) = load_skill_from_file(&system_path) {
                return Ok(skill);
            }
        }
    }

    Err(format!("Skill \"{}\" not found", id))
}

/// 读取 skill 原始文件内容（包含 YAML frontmatter）
#[tauri::command]
#[allow(dead_code)]
pub fn read_skill_raw(app: tauri::AppHandle, id: String) -> Result<String, String> {
    // 先检查用户 skill
    let user_path = get_user_skills_dir().join(format!("{}.md", id));
    if user_path.exists() {
        return fs::read_to_string(&user_path).map_err(|e| e.to_string());
    }

    // 再检查系统 skill
    if let Some(system_dir) = get_system_skills_dir(&app) {
        let system_path = system_dir.join(format!("{}.md", id));
        if system_path.exists() {
            return fs::read_to_string(&system_path).map_err(|e| e.to_string());
        }
    }

    Err(format!("Skill \"{}\" not found", id))
}

/// 加载 Level 3: 技能引用的文件 (references/, scripts/)
#[tauri::command]
#[allow(dead_code)]
pub fn load_skill_reference(app: tauri::AppHandle, id: String, level: String) -> Result<Vec<SkillReference>, String> {
    let mut references = Vec::new();

    // 检查用户 skill 目录
    let user_ref_dir = get_user_skills_dir().join(&id).join(&level);
    if user_ref_dir.exists() {
        for entry in fs::read_dir(&user_ref_dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            if path.is_file() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
                    references.push(SkillReference { name: name.to_string(), content });
                }
            }
        }
    }

    // 检查系统 skill 目录
    if let Some(system_dir) = get_system_skills_dir(&app) {
        let system_ref_dir = system_dir.join(&id).join(&level);
        if system_ref_dir.exists() {
            for entry in fs::read_dir(&system_ref_dir).map_err(|e| e.to_string())? {
                let entry = entry.map_err(|e| e.to_string())?;
                let path = entry.path();
                if path.is_file() {
                    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
                        references.push(SkillReference { name: name.to_string(), content });
                    }
                }
            }
        }
    }

    Ok(references)
}

/// 保存 skill 到用户目录
#[tauri::command]
pub fn save_skill(id: String, content: String) -> Result<(), String> {
    let user_dir = get_user_skills_dir();
    fs::create_dir_all(&user_dir).map_err(|e| e.to_string())?;

    let file_path = user_dir.join(format!("{}.md", id));
    fs::write(&file_path, content).map_err(|e| e.to_string())
}

/// 删除用户 skill
#[tauri::command]
pub fn delete_skill(id: String) -> Result<(), String> {
    let user_path = get_user_skills_dir().join(format!("{}.md", id));

    if user_path.exists() {
        fs::remove_file(&user_path).map_err(|e| e.to_string())
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
