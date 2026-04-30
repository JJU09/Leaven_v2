DROP POLICY IF EXISTS "관리자는 공지사항을 삭제할 수 있다" ON store_announcements;
DROP POLICY IF EXISTS "Store announcements delete" ON store_announcements;
DROP POLICY IF EXISTS "Users can delete announcements" ON store_announcements;
DROP POLICY IF EXISTS "Users can delete store announcements" ON store_announcements;

-- 새 삭제 정책 추가:
-- 1. 매니저 권한(manage_announcements)이 있는 사람은 모든 글 삭제 가능
-- 2. 권한이 없는 사람은 'handover' 타입의 글만 삭제 가능 (단, 본인이 작성한 글이어야 함)

CREATE POLICY "Users can delete store announcements"
ON store_announcements
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM store_members sm
    WHERE sm.store_id = store_announcements.store_id
    AND sm.user_id = auth.uid()
    AND sm.status = 'active'
    AND (
      -- manage_announcements 권한이 있거나
      EXISTS (
        SELECT 1 FROM store_roles sr
        WHERE sr.id = sm.role_id
        AND sr.permissions ? 'manage_announcements'
      )
      OR
      -- view_announcements 권한이 있고, 글 타입이 'handover'이며, 본인이 작성자인 경우
      (
        EXISTS (
          SELECT 1 FROM store_roles sr
          WHERE sr.id = sm.role_id
          AND sr.permissions ? 'view_announcements'
        )
        AND announcement_type = 'handover'
        AND author_id = sm.id
      )
    )
  )
);
