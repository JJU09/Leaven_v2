-- 업무 테이블에 새로운 기획안의 컬럼들 추가 (단일 테이블 전략)

-- 1. 일정 관련
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS end_time timestamp with time zone;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_all_day boolean DEFAULT false;

-- 2. 담당자 복수 매핑
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assignee_ids uuid[] DEFAULT '{}'::uuid[];

-- 3. 체크리스트, 첨부파일, 설정 (JSONB 활용)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS repeat_settings jsonb DEFAULT null;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS notification_settings jsonb DEFAULT '{"beforeDeadline": true, "notifyAssignees": true, "notifyManagerOnComplete": false}'::jsonb;

-- 기존 데이터 마이그레이션: assignee_id가 있으면 assignee_ids 배열에 추가
UPDATE public.tasks 
SET assignee_ids = ARRAY[assignee_id]
WHERE assignee_id IS NOT NULL AND array_length(assignee_ids, 1) IS NULL;

-- 데이터 무결성을 위해 기존 컬럼을 놔두고, 이후에 사용하지 않도록 애플리케이션 레벨에서 제어