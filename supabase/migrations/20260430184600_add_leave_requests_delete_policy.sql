-- Allow users to delete their own pending leave requests
CREATE POLICY "Users can delete their own pending leave requests"
ON public.leave_requests
FOR DELETE
USING (
  -- User must be the one who requested it
  member_id = public.get_current_member_id(store_id)
  -- Can only delete if it's still pending
  AND status = 'pending'
);

-- Also allow users to update their own pending leave requests (e.g. to change details before approval)
-- Optional, but usually expected if they can delete
CREATE POLICY "Users can update their own pending leave requests"
ON public.leave_requests
FOR UPDATE
USING (
  member_id = public.get_current_member_id(store_id)
  AND status = 'pending'
)
WITH CHECK (
  member_id = public.get_current_member_id(store_id)
  -- Prevent changing status to approved/rejected themselves
  AND (
    (status = 'pending')
  )
);