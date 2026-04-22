-- 출퇴근 기록 테이블에 INSERT, UPDATE 권한 추가
-- 본인: 자신의 기록만 추가 및 수정 가능
-- 대리: 점주이거나 관리 권한(manage_schedule 또는 role_info->>'manage_staff' 등, DB 구조에 맞춰)이 있는 경우 추가 및 수정 가능

-- INSERT Policy: 본인이거나 대리 처리
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
        sr.permissions->>'manage_schedule' = 'true' -- 스케줄 관리 권한
      )
    )
  )
);

-- UPDATE Policy: 본인이거나 대리 처리
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
        sr.permissions->>'manage_schedule' = 'true' -- 스케줄 관리 권한
      )
    )
  )
);