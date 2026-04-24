ALTER TABLE public.store_announcements
ADD COLUMN announcement_type TEXT DEFAULT 'notice' CHECK (announcement_type IN ('notice', 'handover')),
ADD COLUMN target_member_ids UUID[] DEFAULT NULL;