-- 이전에 'Manage tasks' (FOR ALL) 정책이 삭제되면서 SELECT 권한이 유실된 문제를 해결하기 위한 마이그레이션

-- 1. 기존 'View tasks' 정책이 불완전하게 적용되어 있을 수 있으므로 재설정
DROP POLICY IF EXISTS "View tasks" ON public.tasks;

-- 2. 명시적인 SELECT 정책 추가
-- 점포 멤버이면서 논리적으로 삭제되지 않은(soft deleted) 업무만 조회 가능
CREATE POLICY "View tasks" ON public.tasks 
FOR SELECT USING (
    public.is_store_member(store_id) 
    AND deleted_at IS NULL
);