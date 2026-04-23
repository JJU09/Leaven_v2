-- ==========================================
-- store_assets 테이블 정책(RLS) 추가
-- ==========================================

-- INSERT: 사용자가 해당 매장의 활성화된 멤버이고, manage_asset 권한(점주/매니저 등)이 있을 때 허용
CREATE POLICY "Manage store assets (INSERT)" ON public.store_assets 
FOR INSERT 
WITH CHECK (
    public.is_store_member(store_id)
);

-- UPDATE: 사용자가 해당 매장의 활성화된 멤버일 때 허용 (추후 상세 권한 제어 가능)
CREATE POLICY "Manage store assets (UPDATE)" ON public.store_assets 
FOR UPDATE 
USING (
    public.is_store_member(store_id) AND deleted_at IS NULL
)
WITH CHECK (
    public.is_store_member(store_id) AND deleted_at IS NULL
);

-- DELETE (Soft delete 포함)
CREATE POLICY "Manage store assets (DELETE)" ON public.store_assets 
FOR DELETE 
USING (
    public.is_store_member(store_id)
);

-- ==========================================
-- asset_maintenance_logs 테이블 정책(RLS) 추가
-- ==========================================
CREATE POLICY "Manage asset logs (INSERT)" ON public.asset_maintenance_logs
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.store_assets a 
        WHERE a.id = asset_id AND public.is_store_member(a.store_id)
    )
);

CREATE POLICY "Manage asset logs (UPDATE)" ON public.asset_maintenance_logs
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.store_assets a 
        WHERE a.id = asset_id AND public.is_store_member(a.store_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.store_assets a 
        WHERE a.id = asset_id AND public.is_store_member(a.store_id)
    )
);

CREATE POLICY "Manage asset logs (DELETE)" ON public.asset_maintenance_logs
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.store_assets a 
        WHERE a.id = asset_id AND public.is_store_member(a.store_id)
    )
);

-- ==========================================
-- asset_status_logs 테이블 정책(RLS) 추가
-- ==========================================
-- asset_status_logs는 보통 내부 트리거나 서버단에서 삽입되나, 직접 넣는 경우를 대비해 권한 추가
CREATE POLICY "Manage asset status logs (INSERT)" ON public.asset_status_logs
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.store_assets a 
        WHERE a.id = asset_id AND public.is_store_member(a.store_id)
    )
);

CREATE POLICY "View asset status logs" ON public.asset_status_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.store_assets a 
        WHERE a.id = asset_id AND public.is_store_member(a.store_id)
    )
);