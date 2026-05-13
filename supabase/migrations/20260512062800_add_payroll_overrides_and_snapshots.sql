-- 1. 급여 공제 수동 보정 이력 테이블
CREATE TABLE IF NOT EXISTS public.deduction_overrides (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payroll_entry_id UUID NOT NULL REFERENCES public.payroll_records(id) ON DELETE CASCADE,
    field TEXT NOT NULL,
    original_value INTEGER NOT NULL,
    overridden_value INTEGER NOT NULL,
    reason TEXT NOT NULL,
    overridden_by UUID NOT NULL REFERENCES public.profiles(id),
    overridden_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deduction_overrides_payroll_id ON public.deduction_overrides(payroll_entry_id);

ALTER TABLE public.deduction_overrides ENABLE ROW LEVEL SECURITY;

-- Select: 매장 급여 관리 권한이 있는 관리자
CREATE POLICY "Admins can view overrides"
    ON public.deduction_overrides FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.payroll_records pr
            WHERE pr.id = deduction_overrides.payroll_entry_id
              AND public.has_store_permission(pr.store_id, 'manage_salary')
        )
    );

-- Select: 본인의 급여 내역인 직원
CREATE POLICY "Users can view own overrides"
    ON public.deduction_overrides FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.payroll_records pr
            JOIN public.store_members sm ON pr.staff_id = sm.id
            WHERE pr.id = deduction_overrides.payroll_entry_id
              AND sm.user_id = auth.uid()
        )
    );

-- Insert: 매장 급여 관리 권한이 있는 관리자
CREATE POLICY "Admins can insert overrides"
    ON public.deduction_overrides FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.payroll_records pr
            WHERE pr.id = deduction_overrides.payroll_entry_id
              AND public.has_store_permission(pr.store_id, 'manage_salary')
        )
    );

-- 2. 급여 확정 스냅샷 테이블
CREATE TABLE IF NOT EXISTS public.payroll_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payroll_entry_id UUID NOT NULL REFERENCES public.payroll_records(id) ON DELETE CASCADE,
    snapshot_data JSONB NOT NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payroll_snapshots_payroll_id ON public.payroll_snapshots(payroll_entry_id);

ALTER TABLE public.payroll_snapshots ENABLE ROW LEVEL SECURITY;

-- Select: 매장 급여 관리 권한이 있는 관리자
CREATE POLICY "Admins can view snapshots"
    ON public.payroll_snapshots FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.payroll_records pr
            WHERE pr.id = payroll_snapshots.payroll_entry_id
              AND public.has_store_permission(pr.store_id, 'manage_salary')
        )
    );

-- Select: 본인의 급여 내역인 직원
CREATE POLICY "Users can view own snapshots"
    ON public.payroll_snapshots FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.payroll_records pr
            JOIN public.store_members sm ON pr.staff_id = sm.id
            WHERE pr.id = payroll_snapshots.payroll_entry_id
              AND sm.user_id = auth.uid()
        )
    );

-- Insert: 매장 급여 관리 권한이 있는 관리자
CREATE POLICY "Admins can insert snapshots"
    ON public.payroll_snapshots FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.payroll_records pr
            WHERE pr.id = payroll_snapshots.payroll_entry_id
              AND public.has_store_permission(pr.store_id, 'manage_salary')
        )
    );