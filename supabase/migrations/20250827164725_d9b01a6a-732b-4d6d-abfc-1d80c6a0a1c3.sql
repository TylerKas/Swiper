-- Add missing columns to profiles table if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS school_email TEXT,
ADD COLUMN IF NOT EXISTS preferences TEXT[],
ADD COLUMN IF NOT EXISTS location TEXT;