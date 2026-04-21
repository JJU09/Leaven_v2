-- Add parent_id to store_roles to support hierarchical roles
ALTER TABLE public.store_roles ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.store_roles(id) ON DELETE SET NULL;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';