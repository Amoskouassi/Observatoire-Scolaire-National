-- Migration 08: Add director fields to schools table
ALTER TABLE ecoles ADD COLUMN IF NOT EXISTS directeur_nom TEXT;
ALTER TABLE ecoles ADD COLUMN IF NOT EXISTS directeur_genre TEXT CHECK (directeur_genre IN ('M', 'Mme', 'Mlle'));
