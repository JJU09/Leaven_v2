ALTER TABLE public.store_attendance_requests
ADD COLUMN target_date DATE;

-- 기존 데이터가 있다면 requested_clock_in 또는 created_at 기반으로 target_date 채우기
UPDATE public.store_attendance_requests
SET target_date = (requested_clock_in AT TIME ZONE 'Asia/Seoul')::date
WHERE target_date IS NULL AND requested_clock_in IS NOT NULL;

UPDATE public.store_attendance_requests
SET target_date = (created_at AT TIME ZONE 'Asia/Seoul')::date
WHERE target_date IS NULL;

-- NOT NULL 제약조건 추가
ALTER TABLE public.store_attendance_requests
ALTER COLUMN target_date SET NOT NULL;