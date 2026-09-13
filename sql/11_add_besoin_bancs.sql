-- Migration 11: Add besoin_bancs column to ecoles table

ALTER TABLE public.ecoles
  ADD COLUMN IF NOT EXISTS besoin_bancs INTEGER DEFAULT 0;

-- Backfill from inventaire_classes
UPDATE public.ecoles
SET besoin_bancs = COALESCE(
  (SELECT SUM(COALESCE((elem->>'besoin_bancs')::int, 0))
   FROM jsonb_array_elements(inventaire_classes) AS elem),
  0
)
WHERE inventaire_classes IS NOT NULL AND inventaire_classes != 'null'::jsonb;
