-- Add UPDATE policy for stores
CREATE POLICY "Users with manage_store permission can update store"
ON public.stores
FOR UPDATE
USING (
  public.has_store_permission(id, 'manage_store')
)
WITH CHECK (
  public.has_store_permission(id, 'manage_store')
);