-- 스케줄 생성, 수정, 삭제 권한 정책
CREATE POLICY "Insert schedules" ON public.schedules 
FOR INSERT 
WITH CHECK (public.has_store_permission(store_id, 'manage_schedule'));

CREATE POLICY "Update schedules" ON public.schedules 
FOR UPDATE 
USING (public.has_store_permission(store_id, 'manage_schedule')) 
WITH CHECK (public.has_store_permission(store_id, 'manage_schedule'));

CREATE POLICY "Delete schedules" ON public.schedules 
FOR DELETE 
USING (public.has_store_permission(store_id, 'manage_schedule'));
