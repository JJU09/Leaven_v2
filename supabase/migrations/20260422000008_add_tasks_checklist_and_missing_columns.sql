-- tasks 테이블에 checklist 및 누락된 컬럼 추가
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'always',
ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS original_repeat_id UUID,
ADD COLUMN IF NOT EXISTS recurrence_rule JSONB;

-- 컬럼 타입 안전성 확보 (혹시라도 assigned_role_ids가 이전 마이그레이션에서 잘못 생성되었을 경우 대비)
-- INITIAL_UNIFIED_SCHEMA에서는 컬럼 자체가 없었으므로 000007에서 추가된 것을 보완
DO $$ 
BEGIN
    -- assigned_role_ids가 TEXT[] 혹은 다른 타입일 경우를 대비해 체크 (필요시)
    -- 여기서는 단순히 checklist 누락 해결에 집중
END $$;