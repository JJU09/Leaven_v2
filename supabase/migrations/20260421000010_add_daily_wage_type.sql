-- Add 'daily' to wage_type enum
ALTER TYPE wage_type ADD VALUE IF NOT EXISTS 'daily';

-- Add base_daily_wage to store_members
ALTER TABLE store_members
ADD COLUMN IF NOT EXISTS base_daily_wage INTEGER DEFAULT 0;

COMMENT ON COLUMN store_members.base_daily_wage IS 'Base daily wage for daily wage type employees';