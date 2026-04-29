-- Add is_late boolean column to store_attendance
ALTER TABLE public.store_attendance ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT false;