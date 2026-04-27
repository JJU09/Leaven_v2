-- 1. 기존 하드코딩된 payroll_records RLS 정책 삭제
DROP POLICY IF EXISTS "Store admins can view all payroll records" ON public.payroll_records;
DROP POLICY IF EXISTS "Store admins can insert payroll records" ON public.payroll_records;
DROP POLICY IF EXISTS "Store admins can update payroll records" ON public.payroll_records;
DROP POLICY IF EXISTS "Store admins can delete payroll records" ON public.payroll_records;

-- 2. has_store_permission 함수를 사용하는 새 RLS 정책 추가
-- Select: 관리자는 모든 내역 조회 가능
CREATE POLICY "Store admins can view all payroll records"
    ON public.payroll_records FOR SELECT
    USING (public.has_store_permission(store_id, 'manage_payroll'));

-- Insert: 관리자만 생성 가능
CREATE POLICY "Store admins can insert payroll records"
    ON public.payroll_records FOR INSERT
    WITH CHECK (public.has_store_permission(store_id, 'manage_payroll'));

-- Update: 관리자만 수정 가능
CREATE POLICY "Store admins can update payroll records"
    ON public.payroll_records FOR UPDATE
    USING (public.has_store_permission(store_id, 'manage_payroll'));

-- Delete: 관리자만 삭제 가능
CREATE POLICY "Store admins can delete payroll records"
    ON public.payroll_records FOR DELETE
    USING (public.has_store_permission(store_id, 'manage_payroll'));
