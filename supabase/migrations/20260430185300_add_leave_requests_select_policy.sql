-- Allow store members to view leave requests for their store
CREATE POLICY "Store members can view leave requests"
ON public.leave_requests
FOR SELECT
USING (
  public.is_store_member(store_id)
);