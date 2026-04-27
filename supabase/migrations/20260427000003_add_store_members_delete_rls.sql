-- Add DELETE policy for store_members
CREATE POLICY "Delete store members" ON public.store_members FOR DELETE USING (
    public.has_role_permission(store_id, 'manage_staff')
);