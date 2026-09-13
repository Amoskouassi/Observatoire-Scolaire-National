-- Migration 10: Fix infinite recursion in profiles RLS policies
-- Run this in Supabase SQL Editor

-- 1. Drop ALL existing policies on profiles
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

-- 2. Disable RLS on profiles entirely (we use service_role key from backend)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 3. Grant permissions to service_role and authenticated
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO anon;
