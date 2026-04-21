-- ==========================================
-- Migration: Allow store creator to view store roles
-- Description: Allows the creator of a store to view its roles even before being added as a member.
-- ==========================================

CREATE POLICY "Allow creator to view store roles" 
ON public.store_roles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.stores 
    WHERE id = store_roles.store_id AND created_by = auth.uid()
  )
);