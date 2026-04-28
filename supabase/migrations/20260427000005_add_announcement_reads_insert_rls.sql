-- Add INSERT policy for announcement_reads
CREATE POLICY "Insert announcement reads" ON public.announcement_reads 
FOR INSERT 
WITH CHECK (
    -- Ensure the user is inserting for their own member_id
    member_id IN (
        SELECT id FROM public.store_members WHERE user_id = auth.uid()
    )
    AND
    -- Ensure the announcement belongs to a store the user is a member of
    public.is_store_member(
        (SELECT store_id FROM public.store_announcements WHERE id = announcement_id)
    )
);
