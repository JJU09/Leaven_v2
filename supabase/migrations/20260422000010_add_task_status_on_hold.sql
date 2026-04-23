-- task_status enum 타입에 on_hold 추가
-- PostgreSQL의 ALTER TYPE ... ADD VALUE는 트랜잭션 내에서 실행될 수 없는 경우가 있어 분리
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'on_hold' AFTER 'in_progress';