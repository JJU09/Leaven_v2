-- Allow users to view their own store_members records regardless of status (active, pending_approval, invited)
-- This is necessary for the /home page to display stores waiting for approval or invitations.
CREATE POLICY "View own store members" ON public.store_members 
FOR SELECT USING (user_id = auth.uid() AND deleted_at IS NULL);

-- Allow users to view stores they are associated with (even if pending or invited)
CREATE POLICY "View associated stores" ON public.stores 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.store_members
    WHERE store_members.store_id = stores.id
    AND store_members.user_id = auth.uid()
    AND store_members.deleted_at IS NULL
  )
  AND deleted_at IS NULL
);