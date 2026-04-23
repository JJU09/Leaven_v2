-- ==========================================
-- Add start_time and end_time to task_assignments
-- ==========================================

ALTER TABLE public.task_assignments
ADD COLUMN start_time TIMESTAMPTZ,
ADD COLUMN end_time TIMESTAMPTZ;
