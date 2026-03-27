-- Add preview column to canvases table for canvas thumbnail/preview
-- Uses runtime column check for SQLite version compatibility
ALTER TABLE canvases ADD COLUMN preview TEXT;