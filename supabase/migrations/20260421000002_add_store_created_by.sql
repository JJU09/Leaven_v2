-- ==========================================
-- Migration: Add created_by to stores and update RLS
-- Description: Adds created_by column with default auth.uid() and allows creators to SELECT their newly created stores immediately.
-- ==========================================

-- 1. Add created_by column to stores table
ALTER TABLE public.stores 
ADD COLUMN created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid();

-- 2. Add SELECT policy for creators
CREATE POLICY "Allow creator to view their store" 
ON public.stores 
FOR SELECT 
USING (auth.uid() = created_by);