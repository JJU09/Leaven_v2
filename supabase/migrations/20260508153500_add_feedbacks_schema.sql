-- Create feedbacks table
CREATE TABLE IF NOT EXISTS public.feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'etc')),
    content TEXT NOT NULL,
    image_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Policies for feedbacks
-- Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback" 
ON public.feedbacks FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback" 
ON public.feedbacks FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Storage bucket for feedbacks
INSERT INTO storage.buckets (id, name, public) 
VALUES ('feedbacks', 'feedbacks', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for feedbacks bucket
-- Allow authenticated users to upload files to feedbacks bucket
CREATE POLICY "Allow authenticated users to upload feedback images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'feedbacks');

-- Allow public to view feedback images
CREATE POLICY "Allow public to view feedback images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'feedbacks');