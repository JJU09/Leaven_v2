-- 기존 공지사항 RLS 정책 삭제
DROP POLICY IF EXISTS "Store members with manage_store permission can insert announcem" ON "public"."store_announcements";
DROP POLICY IF EXISTS "Store members with manage_store permission can update announcem" ON "public"."store_announcements";
DROP POLICY IF EXISTS "Store members with manage_store permission can delete announcem" ON "public"."store_announcements";

-- Helper Function: 사용자가 해당 매장에서 공지사항 관리 권한이 있는지 확인
CREATE OR REPLACE FUNCTION public.can_manage_announcements(store_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM store_members sm
    LEFT JOIN store_roles sr ON sm.role_id = sr.id
    WHERE sm.store_id = store_id_param
    AND sm.user_id = auth.uid()
    AND sm.status = 'active'
    AND (
        sm.role = 'owner'
        OR (sr.permissions ? 'manage_store')
        OR (sr.permissions ? 'manage_announcements')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 새 정책 추가: manage_announcements 권한이나 manage_store 권한을 가진 멤버
CREATE POLICY "Store members with manage announcements permission can insert" ON "public"."store_announcements"
FOR INSERT WITH CHECK (public.can_manage_announcements(store_id));

CREATE POLICY "Store members with manage announcements permission can update" ON "public"."store_announcements"
FOR UPDATE USING (public.can_manage_announcements(store_id)) WITH CHECK (public.can_manage_announcements(store_id));

CREATE POLICY "Store members with manage announcements permission can delete" ON "public"."store_announcements"
FOR DELETE USING (public.can_manage_announcements(store_id));