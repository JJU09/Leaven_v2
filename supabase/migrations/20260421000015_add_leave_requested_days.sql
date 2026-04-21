-- Add requested_days column to leave_requests table
ALTER TABLE public.leave_requests ADD COLUMN requested_days NUMERIC(4, 1) NOT NULL DEFAULT 1;