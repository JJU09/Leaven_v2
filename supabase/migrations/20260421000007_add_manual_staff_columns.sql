-- 1. store_members.user_id NULL 허용 (수기 등록 직원용)
ALTER TABLE public.store_members ALTER COLUMN user_id DROP NOT NULL;

-- 2. 수기 직원 기본 정보 추가
ALTER TABLE public.store_members ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.store_members ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.store_members ADD COLUMN IF NOT EXISTS phone TEXT;

-- 3. 고용 및 계약 상세 정보 추가
ALTER TABLE public.store_members ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'parttime';
ALTER TABLE public.store_members ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.store_members ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.store_members ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE public.store_members ADD COLUMN IF NOT EXISTS hired_at DATE;
ALTER TABLE public.store_members ADD COLUMN IF NOT EXISTS contract_end_date DATE;
ALTER TABLE public.store_members ADD COLUMN IF NOT EXISTS work_hours TEXT;
ALTER TABLE public.store_members ADD COLUMN IF NOT EXISTS work_schedules JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.store_members ADD COLUMN IF NOT EXISTS custom_pay_day INTEGER;
ALTER TABLE public.store_members ADD COLUMN IF NOT EXISTS weekly_holiday INTEGER;
ALTER TABLE public.store_members ADD COLUMN IF NOT EXISTS insurance_status JSONB DEFAULT '{"employment": false, "industrial": false, "national": false, "health": false}'::jsonb;
ALTER TABLE public.store_members ADD COLUMN IF NOT EXISTS custom_wage_settings JSONB;
ALTER TABLE public.store_members ADD COLUMN IF NOT EXISTS memo TEXT;
ALTER TABLE public.store_members ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.store_members ADD COLUMN IF NOT EXISTS resigned_at TIMESTAMPTZ;
ALTER TABLE public.store_members ADD COLUMN IF NOT EXISTS contract_status TEXT;
ALTER TABLE public.store_members ADD COLUMN IF NOT EXISTS modusign_document_id TEXT;
ALTER TABLE public.store_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'staff'; -- legacy fallback