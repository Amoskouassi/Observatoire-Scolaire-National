-- Migration 09: Add school year to ecoles + historical snapshots table
-- Permet comparaison N vs N-1 et filtrage par année scolaire

-- Ajouter annee_scolaire sur ecoles
ALTER TABLE public.ecoles ADD COLUMN IF NOT EXISTS annee_scolaire TEXT;

-- Table snapshots: stats agrégées par zone et année scolaire
CREATE TABLE IF NOT EXISTS public.snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_level TEXT NOT NULL CHECK (zone_level IN ('national', 'district', 'region', 'departement', 'commune')),
  zone_code TEXT NOT NULL,
  annee_scolaire TEXT NOT NULL,
  total_ecoles INTEGER DEFAULT 0,
  total_eleves INTEGER DEFAULT 0,
  total_filles INTEGER DEFAULT 0,
  total_garcons INTEGER DEFAULT 0,
  total_enseignants INTEGER DEFAULT 0,
  by_status JSONB DEFAULT '{}'::jsonb,
  by_milieu JSONB DEFAULT '{}'::jsonb,
  by_statut JSONB DEFAULT '{}'::jsonb,
  by_niveau JSONB DEFAULT '{}'::jsonb,
  infrastructure JSONB DEFAULT '{}'::jsonb,
  taux_filles_pct INTEGER DEFAULT 0,
  taux_collecte_pct INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(zone_level, zone_code, annee_scolaire)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_zone ON public.snapshots(zone_level, zone_code);
CREATE INDEX IF NOT EXISTS idx_snapshots_annee ON public.snapshots(annee_scolaire);

ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read snapshots" ON public.snapshots;
CREATE POLICY "Public read snapshots"
  ON public.snapshots FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service write snapshots" ON public.snapshots;
CREATE POLICY "Service write snapshots"
  ON public.snapshots FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service update snapshots" ON public.snapshots;
CREATE POLICY "Service update snapshots"
  ON public.snapshots FOR UPDATE
  USING (true);
