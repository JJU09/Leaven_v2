-- ==========================================
-- Migration: Add INSERT policy to profiles
-- Description: Allows users to insert their own profile to support upsert operations during onboarding/account setup.
-- ==========================================

CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);