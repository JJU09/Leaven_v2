ALTER TABLE "public"."stores"
  ADD COLUMN IF NOT EXISTS "owner_name" text,
  ADD COLUMN IF NOT EXISTS "store_phone" text,
  ADD COLUMN IF NOT EXISTS "zip_code" text,
  ADD COLUMN IF NOT EXISTS "address_detail" text,
  ADD COLUMN IF NOT EXISTS "image_url" text,
  ADD COLUMN IF NOT EXISTS "stamp_image_url" text;