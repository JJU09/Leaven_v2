-- Add missing settings columns to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS wage_start_day INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS wage_end_day INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pay_day INTEGER,
ADD COLUMN IF NOT EXISTS wage_exceptions JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS leave_calc_type TEXT DEFAULT 'monthly';

-- Comment on the new columns for better context
COMMENT ON COLUMN stores.wage_start_day IS 'Day of the month when wage period starts';
COMMENT ON COLUMN stores.wage_end_day IS 'Day of the month when wage period ends (0 for end of month)';
COMMENT ON COLUMN stores.pay_day IS 'Day of the month when wages are paid';
COMMENT ON COLUMN stores.wage_exceptions IS 'Custom wage settings for different employment types';
COMMENT ON COLUMN stores.leave_calc_type IS 'Calculation type for leave days (e.g., monthly, annual)';