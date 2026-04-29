-- Fix tasks table UPDATE RLS policy for soft delete properly

DROP POLICY IF EXISTS "Update tasks" ON public.tasks;

CREATE POLICY "Update tasks" ON public.tasks 
FOR UPDATE USING (
    public.is_store_member(store_id)
    AND (
        public.can_manage_tasks(store_id) 
        OR auth.uid() = ANY(assignee_ids)
    )
) WITH CHECK (
    public.is_store_member(store_id)
    AND (
        public.can_manage_tasks(store_id) 
        OR auth.uid() = ANY(assignee_ids)
    )
);