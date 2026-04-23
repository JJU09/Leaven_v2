-- tasks 테이블에서 불필요한 컬럼 삭제
ALTER TABLE public.tasks 
DROP COLUMN IF EXISTS end_time,
DROP COLUMN IF EXISTS estimated_minutes,
DROP COLUMN IF EXISTS is_critical,
DROP COLUMN IF EXISTS original_repeat_id,
DROP COLUMN IF EXISTS recurrence_rule;