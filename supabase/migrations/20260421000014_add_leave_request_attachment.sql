-- Add attachment_url column to leave_requests table
ALTER TABLE public.leave_requests ADD COLUMN attachment_url TEXT;

-- Create storage bucket for store_documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store_documents',
  'store_documents',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

-- Set up RLS policies for the storage bucket
CREATE POLICY "Allow public view access to store_documents"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'store_documents' );

CREATE POLICY "Allow authenticated users to upload to store_documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK ( bucket_id = 'store_documents' );