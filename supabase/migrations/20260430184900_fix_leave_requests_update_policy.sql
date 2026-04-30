-- Drop the existing policy created in the previous migration
DROP POLICY IF EXISTS "Users can update their own pending leave requests" ON public.leave_requests;

-- Re-create it with permission to change status to 'cancelled'
CREATE POLICY "Users can update their own pending leave requests"
ON public.leave_requests
FOR UPDATE
USING (
  -- User must be the one who requested it
  member_id = public.get_current_member_id(store_id)
  -- Can only update if it was originally pending
  AND status = 'pending'
)
WITH CHECK (
  member_id = public.get_current_member_id(store_id)
  -- Allow changing status to 'canceled' or keeping it 'pending'
  AND (status IN ('pending', 'canceled'))
);
