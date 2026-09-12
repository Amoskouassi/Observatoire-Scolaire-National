-- Migration 04: Add zone assignment fields + extended roles to profiles
-- Run this in Supabase SQL Editor

-- 1. Add missing zone columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS district_code TEXT,
  ADD COLUMN IF NOT EXISTS departement_code TEXT;

-- 2. Extend role CHECK to include all official roles
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin', 'mairie', 'institution', 'enqueteur',
    'president_region', 'ministre', 'directeur_afrique',
    'partenaire', 'chercheur'
  ));

-- 3. Create index for zone lookups
CREATE INDEX IF NOT EXISTS idx_profiles_district ON public.profiles(district_code);
CREATE INDEX IF NOT EXISTS idx_profiles_region ON public.profiles(region_code);
CREATE INDEX IF NOT EXISTS idx_profiles_departement ON public.profiles(departement_code);
