-- 1. Helper function to check if a user has a specific permission in a store
CREATE OR REPLACE FUNCTION public.has_store_permission(store_id_param UUID, permission_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.store_members sm
    JOIN public.store_roles sr ON sm.role_id = sr.id
    WHERE sm.store_id = store_id_param
      AND sm.user_id = auth.uid()
      AND sm.status = 'active'
      AND sm.deleted_at IS NULL
      AND (
        sr.hierarchy_level >= 100 -- Owner always has permission
        OR sr.permissions ? permission_param -- Check if JSONB array contains the permission
      )
  );
END;
$$;

-- 2. Helper function to get the current user's member_id in a specific store
CREATE OR REPLACE FUNCTION public.get_current_member_id(store_id_param UUID)
RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_member_id UUID;
BEGIN
  SELECT id INTO v_member_id
  FROM public.store_members
  WHERE store_id = store_id_param
    AND user_id = auth.uid()
    AND status = 'active'
    AND deleted_at IS NULL
  LIMIT 1;
  
  RETURN v_member_id;
END;
$$;

-- 3. Add INSERT policy for leave_requests
CREATE POLICY "Users can insert leave requests"
ON public.leave_requests
FOR INSERT
WITH CHECK (
  -- User must be a member of the store
  public.is_store_member(store_id)
  AND (
    -- EITHER: User is requesting for themselves
    member_id = public.get_current_member_id(store_id)
    -- OR: User has 'manage_leave' permission (can request for others)
    OR public.has_store_permission(store_id, 'manage_leave')
  )
);

-- 4. Add UPDATE policy for leave_requests
CREATE POLICY "Managers can update leave requests"
ON public.leave_requests
FOR UPDATE
USING (
  public.has_store_permission(store_id, 'manage_leave')
)
WITH CHECK (
  public.has_store_permission(store_id, 'manage_leave')
);