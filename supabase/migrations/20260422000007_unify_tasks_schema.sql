-- 1. task_assignments 테이블의 컬럼들을 tasks 테이블로 통합
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES public.schedules(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_date DATE,
ADD COLUMN IF NOT EXISTS status public.task_status NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS completion_note TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS assigned_role_ids UUID[] DEFAULT '{}'::UUID[];

-- 2. 기존 tasks의 category 필드 유지 및 is_template 필드 (이미 코드에서 사용 중이므로 명시적 확인)
-- (INITIAL_UNIFIED_SCHEMA에 이미 is_template이 누락되었다면 추가)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tasks' AND column_name = 'is_template') THEN
        ALTER TABLE public.tasks ADD COLUMN is_template BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 3. 데이터 이관 (만약 task_assignments에 데이터가 있다면)
-- 이 프로젝트는 초기 개발 단계이므로 스키마 통합에 집중

-- 4. 불필요해진 task_assignments 테이블 삭제
DROP TABLE IF EXISTS public.task_assignments CASCADE;

-- 5. 인덱스 최적화
CREATE INDEX IF NOT EXISTS idx_tasks_store_id ON public.tasks(store_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_date ON public.tasks(assigned_date);
CREATE INDEX IF NOT EXISTS idx_tasks_is_template ON public.tasks(is_template);

-- 6. RLS 정책 재검토 (통합된 tasks 테이블에 맞춤)
-- 기존 정책이 이미 is_store_member를 사용하고 있으므로 컬럼 추가 후에도 작동하나, 
-- 개인 업무 조회를 위해 정책 보강이 필요할 수 있음
DROP POLICY IF EXISTS "View tasks" ON public.tasks;
CREATE POLICY "View tasks" ON public.tasks 
FOR SELECT USING (
    public.is_store_member(store_id) 
    AND deleted_at IS NULL
);

DROP POLICY IF EXISTS "Manage tasks" ON public.tasks;
CREATE POLICY "Manage tasks" ON public.tasks 
FOR ALL USING (
    public.is_store_member(store_id) 
    AND deleted_at IS NULL
);