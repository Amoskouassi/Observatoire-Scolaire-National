-- Migration 12: Fix collects table CHECK constraints + add missing columns

-- Allow maternelle in niveau_enseignement
ALTER TABLE public.collectes
  DROP CONSTRAINT IF EXISTS collects_niveau_enseignement_check;

ALTER TABLE public.collectes
  ADD CONSTRAINT collects_niveau_enseignement_check
  CHECK (niveau_enseignement IN ('primaire', 'secondaire', 'maternelle', 'superieur'));
