-- Soft delete(논리적 삭제) 시 발생하는 RLS (Row Level Security) 오류 수정을 위한 마이그레이션

-- 1. 기존 Update 정책 제거
DROP POLICY IF EXISTS "Update tasks" ON public.tasks;

-- 2. 새 Update 정책 생성
-- USING 절에서 'deleted_at IS NULL' 조건을 제거하여, 
-- deleted_at을 현재 시간으로 업데이트하는 행위가 RLS 조건을 위반하지 않도록 허용합니다.
CREATE POLICY "Update tasks" ON public.tasks 
FOR UPDATE USING (
    public.is_store_member(store_id) 
    AND (
        public.can_manage_tasks(store_id) 
        OR auth.uid() = ANY(assignee_ids)
    )
) WITH CHECK (
    public.is_store_member(store_id)
);