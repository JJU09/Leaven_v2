-- 기존의 제약 조건 이름 확인 (일반적으로 테이블명_컬럼명_check 형식)
ALTER TABLE public.ai_reports DROP CONSTRAINT IF EXISTS ai_reports_report_type_check;

-- 새로운 제약 조건 추가 (daily, weekly, monthly 허용)
ALTER TABLE public.ai_reports ADD CONSTRAINT ai_reports_report_type_check CHECK (report_type IN ('daily', 'weekly', 'monthly'));