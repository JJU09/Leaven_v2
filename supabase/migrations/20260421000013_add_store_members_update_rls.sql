-- store_members 테이블에 대한 UPDATE 정책 추가
-- 'manage_staff' 권한이 있는 사용자만 업데이트 가능하도록 허용
-- 본인 정보 업데이트에 대한 정책이 필요할 수 있으나, 현재는 관리자 권한을 우선적으로 확인

CREATE POLICY "Manage store members" ON public.store_members FOR UPDATE USING (
    public.has_role_permission(store_id, 'manage_staff')
) WITH CHECK (
    public.has_role_permission(store_id, 'manage_staff')
);