-- 1. Add missing wage columns to store_members
ALTER TABLE public.store_members
ADD COLUMN IF NOT EXISTS base_daily_wage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_yearly_wage INTEGER DEFAULT 0;

-- 2. Create payroll_status ENUM
DO $$ BEGIN
    CREATE TYPE public.payroll_status AS ENUM ('draft', 'confirmed', 'paid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create payroll_records table
CREATE TABLE IF NOT EXISTS public.payroll_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.store_members(id) ON DELETE CASCADE,
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL,
    wage_type public.wage_type NOT NULL,
    
    work_days INTEGER NOT NULL DEFAULT 0,
    work_hours NUMERIC(10, 2) NOT NULL DEFAULT 0,
    overtime_hours NUMERIC(10, 2) NOT NULL DEFAULT 0,
    
    base_pay INTEGER NOT NULL DEFAULT 0,
    overtime_pay INTEGER NOT NULL DEFAULT 0,
    weekly_holiday_pay INTEGER NOT NULL DEFAULT 0,
    gross_pay INTEGER NOT NULL DEFAULT 0,
    
    income_tax INTEGER NOT NULL DEFAULT 0,
    local_income_tax INTEGER NOT NULL DEFAULT 0,
    national_pension INTEGER NOT NULL DEFAULT 0,
    health_insurance INTEGER NOT NULL DEFAULT 0,
    employment_insurance INTEGER NOT NULL DEFAULT 0,
    long_term_care INTEGER NOT NULL DEFAULT 0,
    
    total_deduction INTEGER NOT NULL DEFAULT 0,
    net_pay INTEGER NOT NULL DEFAULT 0,
    
    status public.payroll_status NOT NULL DEFAULT 'draft',
    confirmed_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    note TEXT,
    
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    CONSTRAINT unique_staff_period UNIQUE (staff_id, period_year, period_month)
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_payroll_records_store_id ON public.payroll_records(store_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_staff_id ON public.payroll_records(staff_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_period ON public.payroll_records(store_id, period_year, period_month);

-- 5. Updated_at Trigger
DROP TRIGGER IF EXISTS update_payroll_records_updated_at ON public.payroll_records;
CREATE TRIGGER update_payroll_records_updated_at
    BEFORE UPDATE ON public.payroll_records
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- 6. RLS Policies
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;

-- Select: 직원은 본인의 급여 내역 조회 가능
CREATE POLICY "Users can view own payroll records"
    ON public.payroll_records FOR SELECT
    USING (
        staff_id IN (
            SELECT id FROM public.store_members WHERE user_id = auth.uid()
        )
    );

-- Select: 매장 관리자(owner, manager)는 모든 직원의 급여 내역 조회 가능
CREATE POLICY "Store admins can view all payroll records"
    ON public.payroll_records FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.store_members sm
            JOIN public.store_roles sr ON sm.role_id = sr.id
            WHERE sm.store_id = payroll_records.store_id
              AND sm.user_id = auth.uid()
              AND sr.name IN ('owner', 'manager')
        )
    );

-- Insert: 매장 관리자만 생성 가능
CREATE POLICY "Store admins can insert payroll records"
    ON public.payroll_records FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.store_members sm
            JOIN public.store_roles sr ON sm.role_id = sr.id
            WHERE sm.store_id = payroll_records.store_id
              AND sm.user_id = auth.uid()
              AND sr.name IN ('owner', 'manager')
        )
    );

-- Update: 매장 관리자만 수정 가능
CREATE POLICY "Store admins can update payroll records"
    ON public.payroll_records FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.store_members sm
            JOIN public.store_roles sr ON sm.role_id = sr.id
            WHERE sm.store_id = payroll_records.store_id
              AND sm.user_id = auth.uid()
              AND sr.name IN ('owner', 'manager')
        )
    );

-- Delete: 매장 관리자만 삭제 가능
CREATE POLICY "Store admins can delete payroll records"
    ON public.payroll_records FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.store_members sm
            JOIN public.store_roles sr ON sm.role_id = sr.id
            WHERE sm.store_id = payroll_records.store_id
              AND sm.user_id = auth.uid()
              AND sr.name IN ('owner', 'manager')
        )
    );