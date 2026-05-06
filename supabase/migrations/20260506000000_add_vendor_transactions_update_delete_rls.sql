-- vendor_transactions 테이블에 대한 UPDATE 및 DELETE 권한 확인을 위해 기존 정책 재확인 및 추가/수정
-- 하드코딩된 직급 이름 대신 'manage_vendor' 권한을 통해서만 허용하도록 수정

DROP POLICY IF EXISTS "Enable update for manage_vendor permission" ON public.vendor_transactions;
DROP POLICY IF EXISTS "Enable delete for manage_vendor permission" ON public.vendor_transactions;

-- 1. Update (UPDATE) - manage_vendor 권한
CREATE POLICY "Enable update for manage_vendor permission"
    ON public.vendor_transactions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.store_members sm
            LEFT JOIN public.store_roles sr ON sm.role_id = sr.id
            WHERE sm.store_id = vendor_transactions.store_id
            AND sm.user_id = auth.uid()
            AND sm.status = 'active'
            AND sr.permissions ? 'manage_vendor'
        )
    );

-- 2. Delete (DELETE) - manage_vendor 권한 (완전 삭제 시)
CREATE POLICY "Enable delete for manage_vendor permission"
    ON public.vendor_transactions
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.store_members sm
            LEFT JOIN public.store_roles sr ON sm.role_id = sr.id
            WHERE sm.store_id = vendor_transactions.store_id
            AND sm.user_id = auth.uid()
            AND sm.status = 'active'
            AND sr.permissions ? 'manage_vendor'
        )
    );