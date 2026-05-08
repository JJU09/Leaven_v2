ALTER TABLE public.profiles ADD COLUMN user_type TEXT CHECK (user_type IN ('owner', 'staff'));
COMMENT ON COLUMN public.profiles.user_type IS '사용자 유형 (owner: 점주, staff: 직원)';