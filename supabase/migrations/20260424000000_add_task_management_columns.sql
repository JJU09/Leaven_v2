-- Add missing columns for Task Management UI
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES public.store_members(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigner_id UUID REFERENCES public.store_members(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_done BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS done_at TIMESTAMPTZ;

-- Backfill due_date from assigned_date if available
UPDATE public.tasks SET due_date = assigned_date WHERE due_date IS NULL AND assigned_date IS NOT NULL;

-- Backfill assignee_id if possible (requires join with profiles/store_members, but we'll skip for now)