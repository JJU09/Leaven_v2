-- Drop the existing foreign key constraint that links author_id to profiles
ALTER TABLE "public"."store_announcements" 
DROP CONSTRAINT IF EXISTS "store_announcements_author_id_fkey";

-- Clean up any invalid data before applying the new constraint
-- We use CASCADE to also delete dependent rows in announcement_reads
TRUNCATE TABLE "public"."store_announcements" CASCADE;

-- Add the new foreign key constraint linking author_id to store_members
ALTER TABLE "public"."store_announcements"
ADD CONSTRAINT "store_announcements_author_id_fkey" 
FOREIGN KEY ("author_id") REFERENCES "public"."store_members"("id") ON DELETE CASCADE;
