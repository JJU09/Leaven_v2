ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS account_number text,
ADD COLUMN IF NOT EXISTS account_holder text,
DROP COLUMN IF EXISTS bank_account;
