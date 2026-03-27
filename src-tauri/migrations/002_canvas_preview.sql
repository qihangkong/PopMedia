-- Add preview column to canvases table for canvas thumbnail/preview
-- Uses IF NOT EXISTS for idempotency (SQLite 3.35+)
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS preview TEXT;
