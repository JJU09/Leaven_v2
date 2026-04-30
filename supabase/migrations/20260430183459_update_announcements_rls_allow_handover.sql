-- Drop existing insert and update policies
DROP POLICY IF EXISTS "관리자는 공지사항을 등록할 수 있다" ON store_announcements;
DROP POLICY IF EXISTS "관리자는 공지사항을 수정할 수 있다" ON store_announcements;
DROP POLICY IF EXISTS "Store announcements insert" ON store_announcements;
DROP POLICY IF EXISTS "Store announcements update" ON store_announcements;
DROP POLICY IF EXISTS "Users can insert announcements" ON store_announcements;
DROP POLICY IF EXISTS "Users can update announcements" ON store_announcements;
DROP POLICY IF EXISTS "Users can create store announcements" ON store_announcements;
DROP POLICY IF EXISTS "Users can update store announcements" ON store_announcements;

-- 새 정책 추가:
-- 1. 매니저 권한(manage_announcements)이 있는 사람은 모든 글 생성 가능
-- 2. 권한이 없는 사람은 'handover' 타입의 글만 생성 가능 (단, 자신이 속한 매장이며, 본인이 author_id로 지정된 경우)

CREATE POLICY "Users can create store announcements"
ON store_announcements
FOR INSERT
TO authenticated
WITH CHECK (
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

CREATE POLICY "Users can update store announcements"
ON store_announcements
FOR UPDATE
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
