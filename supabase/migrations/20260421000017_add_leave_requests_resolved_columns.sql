-- leave_requests 테이블에 resolved_at, resolved_by 컬럼 추가
ALTER TABLE public.leave_requests
ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id);

-- 코멘트 추가
COMMENT ON COLUMN public.leave_requests.resolved_at IS '승인/반려/취소 처리된 일시';
COMMENT ON COLUMN public.leave_requests.resolved_by IS '요청을 처리한 관리자의 user_id';

-- 스키마 캐시 갱신 (PostgREST)
NOTIFY pgrst, 'reload schema';