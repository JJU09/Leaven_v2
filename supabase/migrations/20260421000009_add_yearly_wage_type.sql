-- Add 'yearly' to wage_type enum
ALTER TYPE wage_type ADD VALUE IF NOT EXISTS 'yearly';

-- Add base_yearly_wage to store_members
ALTER TABLE store_members
ADD COLUMN IF NOT EXISTS base_yearly_wage INTEGER DEFAULT 0;

COMMENT ON COLUMN store_members.base_yearly_wage IS 'Base yearly wage for yearly wage type employees';