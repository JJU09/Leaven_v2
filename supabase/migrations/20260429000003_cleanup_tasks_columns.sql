-- 1. category 컬럼 삭제 (사용하지 않음)
ALTER TABLE public.tasks DROP COLUMN IF EXISTS category;

-- 2. assigned_role_id 단일 컬럼 삭제 (assigned_role_ids 배열로 완전 대체)
ALTER TABLE public.tasks DROP COLUMN IF EXISTS assigned_role_id;

-- 3. recurrence_rule 컬럼 삭제 (repeat_settings로 대체)
ALTER TABLE public.tasks DROP COLUMN IF EXISTS recurrence_rule;

-- 4. is_template 컬럼 삭제 (is_routine으로 역할 대체)
ALTER TABLE public.tasks DROP COLUMN IF EXISTS is_template;

-- 5. assignee_id 단일 컬럼 삭제 (assignee_ids 배열로 완전 대체)
ALTER TABLE public.tasks DROP COLUMN IF EXISTS assignee_id;
