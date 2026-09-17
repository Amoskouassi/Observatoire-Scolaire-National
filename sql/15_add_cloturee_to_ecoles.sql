-- Migration 15: Add cloturee column to ecoles table
ALTER TABLE ecoles ADD COLUMN IF NOT EXISTS cloturee BOOLEAN DEFAULT false;
ALTER TABLE ecoles ADD COLUMN IF NOT EXISTS toilettes_separees_garcons_filles BOOLEAN DEFAULT false;
ALTER TABLE ecoles ADD COLUMN IF NOT EXISTS toilettes_separees_hommes_femmes BOOLEAN DEFAULT false;

-- Add toilettes séparées columns to collectes table
ALTER TABLE collectes ADD COLUMN IF NOT EXISTS toilettes_separees_garcons_filles BOOLEAN DEFAULT false;
ALTER TABLE collectes ADD COLUMN IF NOT EXISTS toilettes_separees_hommes_femmes BOOLEAN DEFAULT false;
