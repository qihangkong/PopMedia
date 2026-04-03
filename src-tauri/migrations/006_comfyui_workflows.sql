-- Create comfyui_workflows table
CREATE TABLE IF NOT EXISTS comfyui_workflows (
    id TEXT PRIMARY KEY,
    comfyui_id TEXT NOT NULL,
    name TEXT NOT NULL,
    workflow_data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (comfyui_id) REFERENCES comfyui_configs(id) ON DELETE CASCADE
);