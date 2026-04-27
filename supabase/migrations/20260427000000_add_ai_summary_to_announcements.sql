-- Add ai_summary column to store_announcements table
ALTER TABLE store_announcements ADD COLUMN IF NOT EXISTS ai_summary jsonb;