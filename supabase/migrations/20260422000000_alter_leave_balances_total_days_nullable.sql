-- leave_balances 테이블의 total_days 컬럼의 NOT NULL 제약조건을 해제하여, 
-- 클라이언트 측에서 입사일 기준 자동 계산을 수행할 수 있도록 null 값을 허용합니다.
ALTER TABLE public.leave_balances ALTER COLUMN total_days DROP NOT NULL;
ALTER TABLE public.leave_balances ALTER COLUMN total_days DROP DEFAULT;