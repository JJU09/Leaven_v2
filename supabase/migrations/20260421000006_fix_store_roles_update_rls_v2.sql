-- 1. 권한 체크 유틸리티 함수 생성 (has_role_permission)
CREATE OR REPLACE FUNCTION public.has_role_permission(store_id_param UUID, permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.store_members sm
    JOIN public.store_roles sr ON sm.role_id = sr.id
    WHERE sm.store_id = store_id_param
    AND sm.user_id = auth.uid()
    AND sm.status = 'active'
    AND sm.deleted_at IS NULL
    AND sr.deleted_at IS NULL
    AND (
      sr.permissions ? permission_code
      OR sr.hierarchy_level >= 100
    )
  );
END;
$$;

-- 2. 기존 store_roles 정책 삭제 후 재작성
DROP POLICY IF EXISTS "Manage store roles" ON public.store_roles;
DROP POLICY IF EXISTS "Insert store roles" ON public.store_roles;
DROP POLICY IF EXISTS "Update store roles" ON public.store_roles;
DROP POLICY IF EXISTS "Delete store roles" ON public.store_roles;

-- INSERT/UPDATE/DELETE는 manage_roles 권한을 가진 자만 가능
CREATE POLICY "Insert store roles" ON public.store_roles 
FOR INSERT WITH CHECK (public.has_role_permission(store_id, 'manage_roles'));

CREATE POLICY "Update store roles" ON public.store_roles 
FOR UPDATE USING (public.has_role_permission(store_id, 'manage_roles'));

CREATE POLICY "Delete store roles" ON public.store_roles 
FOR DELETE USING (public.has_role_permission(store_id, 'manage_roles'));