CREATE OR REPLACE FUNCTION public.delete_store(store_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the current user is the owner (or has permission)
  -- For safety, we can check if the user is the creator of the store
  -- or if they have 'manage_store' permission.
  
  IF NOT EXISTS (
    SELECT 1 FROM stores 
    WHERE id = store_id_param 
    AND created_by = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only the store creator can delete the store';
  END IF;

  -- Due to foreign key constraints with ON DELETE CASCADE, 
  -- deleting the store will delete related records.
  -- Or if ON DELETE CASCADE is not fully set up, we might need to delete them manually.
  -- Assuming cascade is set up, we just delete the store:
  DELETE FROM stores WHERE id = store_id_param;
END;
$$;
