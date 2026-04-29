                                                                           -- Fix tasks table RLS to allow soft deletes (updating deleted_at)

DROP POLICY IF EXISTS "Manage tasks" ON public.tasks;

-- Select (already exists but we can recreate to be sure, or just leave it)
-- The "View tasks" policy was: CREATE POLICY "View tasks" ON public.tasks FOR SELECT USING (is_store_member(store_id) AND deleted_at IS NULL);

-- Insert policy
CREATE POLICY "Insert tasks" ON public.tasks 
FOR INSERT WITH CHECK (
    public.is_store_member(store_id) 
    AND deleted_at IS NULL
);

-- Helper function to check if a user has task management permissions
CREATE OR REPLACE FUNCTION public.can_manage_tasks(store_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.store_members sm
    JOIN public.store_roles sr ON sm.role_id = sr.id
    WHERE sm.store_id = store_id_param
      AND sm.user_id = auth.uid()
      AND (
        sr.hierarchy_level >= 100 -- Owner always has permission
        OR sr.permissions ? 'manage_tasks'
      )
  );
END;
$$;

-- Update policy
-- Only users with 'manage_tasks' permission OR assigned to the task can update
-- (Allowing assignees to toggle status etc. Managing deletion is handled by frontend check, but technically possible via SQL if assignee)
CREATE POLICY "Update tasks" ON public.tasks 
FOR UPDATE USING (
    public.is_store_member(store_id) 
    AND deleted_at IS NULL
    AND (
        public.can_manage_tasks(store_id) 
        OR auth.uid() = ANY(assignee_ids)
    )
) WITH CHECK (
    public.is_store_member(store_id)
);

-- Delete policy (for hard deletes if needed)
CREATE POLICY "Delete tasks" ON public.tasks 
FOR DELETE USING (
    public.can_manage_tasks(store_id)
);
