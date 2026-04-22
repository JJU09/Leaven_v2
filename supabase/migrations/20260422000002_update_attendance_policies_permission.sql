-- 기존의 잘못된 권한 체크를 가진 정책 삭제
DROP POLICY IF EXISTS "Insert attendance" ON public.store_attendance;
DROP POLICY IF EXISTS "Update attendance" ON public.store_attendance;

-- INSERT Policy: 본인이거나 대리 처리 (manage_attendance 권한으로 수정)
CREATE POLICY "Insert attendance" ON public.store_attendance
FOR INSERT
WITH CHECK (
  (
    EXISTS (
      SELECT 1 FROM public.store_members sm 
      WHERE sm.id = store_attendance.member_id 
      AND sm.user_id = auth.uid()
      AND sm.status = 'active'
    )
  )
  OR
  (
    EXISTS (
      SELECT 1 FROM public.store_members sm
      JOIN public.store_roles sr ON sm.role_id = sr.id
      WHERE sm.store_id = store_attendance.store_id
      AND sm.user_id = auth.uid()
      AND sm.status = 'active'
      AND (
        sr.hierarchy_level = 100 -- 점주
        OR 
        sr.permissions->>'manage_attendance' = 'true' -- 근태 관리 권한
      )
    )
  )
);

-- UPDATE Policy: 본인이거나 대리 처리 (manage_attendance 권한으로 수정)
CREATE POLICY "Update attendance" ON public.store_attendance
FOR UPDATE
USING (
  (
    EXISTS (
      SELECT 1 FROM public.store_members sm 
      WHERE sm.id = store_attendance.member_id 
      AND sm.user_id = auth.uid()
      AND sm.status = 'active'
    )
  )
  OR
  (
    EXISTS (
      SELECT 1 FROM public.store_members sm
      JOIN public.store_roles sr ON sm.role_id = sr.id
      WHERE sm.store_id = store_attendance.store_id
      AND sm.user_id = auth.uid()
      AND sm.status = 'active'
      AND (
        sr.hierarchy_level = 100 -- 점주
        OR 
        sr.permissions->>'manage_attendance' = 'true' -- 근태 관리 권한
      )
    )
  )
);