-- Add project details columns
ALTER TABLE projects ADD COLUMN description TEXT;
ALTER TABLE projects ADD COLUMN video_ratio TEXT;
ALTER TABLE projects ADD COLUMN video_style TEXT;
