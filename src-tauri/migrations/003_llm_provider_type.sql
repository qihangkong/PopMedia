-- Add provider_type column to llm_configs
-- Default to 'custom' for existing records
ALTER TABLE llm_configs ADD COLUMN provider_type TEXT NOT NULL DEFAULT 'custom';
