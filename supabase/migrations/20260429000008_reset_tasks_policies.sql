-- 완전히 정리된 Tasks 테이블 RLS 정책

-- 기존에 존재할 수 있는 모든 정책 삭제
DROP POLICY IF EXISTS "View tasks" ON public.tasks;
DROP POLICY IF EXISTS "Insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Manage tasks" ON public.tasks;

-- 1. SELECT (조회)
-- 점포 멤버이고, 삭제되지 않은 업무만 조회
CREATE POLICY "View tasks" ON public.tasks
FOR SELECT USING (
    public.is_store_member(store_id)
    AND deleted_at IS NULL
);

-- 2. INSERT (생성)
CREATE POLICY "Insert tasks" ON public.tasks 
FOR INSERT WITH CHECK (
    public.is_store_member(store_id) 
    AND deleted_at IS NULL
);

-- 3. UPDATE (수정 및 소프트 삭제)
-- USING: 기존 행을 찾을 수 있는 조건 (점포 멤버)
-- WITH CHECK: 업데이트 후의 새 행이 만족해야 하는 조건. (소프트 삭제를 위해 deleted_at IS NULL 조건 제외)
CREATE POLICY "Update tasks" ON public.tasks 
FOR UPDATE USING (
    public.is_store_member(store_id)
) WITH CHECK (
    public.is_store_member(store_id)
);

-- 4. DELETE (완전 삭제 - 하드 딜리트)
CREATE POLICY "Delete tasks" ON public.tasks 
FOR DELETE USING (
    public.can_manage_tasks(store_id)
);
