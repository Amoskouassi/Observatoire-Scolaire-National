-- ============================================================
-- OBSERVATOIRE SCOLAIRE NATIONAL — Schéma Supabase/PostGIS
-- Version: 2.0
-- Date: 2026-09-05
-- ============================================================

-- Activer PostGIS
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: profiles (liée à auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'enqueteur'
    CHECK (role IN ('admin', 'mairie', 'institution', 'enqueteur')),
  organisation TEXT,
  commune_code TEXT,
  region_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: chaque utilisateur ne voit que son profil (admin voit tout)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Voir son propre profil" ON public.profiles;
CREATE POLICY "Voir son propre profil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin voit tous les profils" ON public.profiles;
CREATE POLICY "Admin voit tous les profils"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin gère les profils" ON public.profiles;
CREATE POLICY "Admin gère les profils"
  ON public.profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Insert own profile" ON public.profiles;
CREATE POLICY "Insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- TABLE: ecoles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ecoles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_mena TEXT UNIQUE NOT NULL,
  nom_etablissement TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'public'
    CHECK (statut IN ('public', 'prive_laic', 'prive_confessionnel', 'communautaire_non_reconnue')),
  niveau_enseignement TEXT NOT NULL
    CHECK (niveau_enseignement IN ('maternelle', 'primaire', 'secondaire', 'superieur')),
  milieu_implantation TEXT NOT NULL DEFAULT 'urbain'
    CHECK (milieu_implantation IN ('urbain', 'rural')),
  categorie TEXT,
  type_genre TEXT,
  annee_creation INTEGER CHECK (annee_creation BETWEEN 1900 AND EXTRACT(YEAR FROM now())),

  -- Localisation
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -8.5 AND -2.5),
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN 4.0 AND 11.0),
  geom GEOMETRY(Point, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
  ) STORED,

  -- Rattachement administratif
  commune_code TEXT NOT NULL,
  departement_code TEXT,
  region_code TEXT,
  district_code TEXT,

  -- Effectifs
  nombre_filles INTEGER DEFAULT 0 CHECK (nombre_filles >= 0),
  nombre_garcons INTEGER DEFAULT 0 CHECK (nombre_garcons >= 0),
  eleves_total INTEGER GENERATED ALWAYS AS (nombre_filles + nombre_garcons) STORED,
  enseignants_presents INTEGER DEFAULT 0 CHECK (enseignants_presents >= 0),
  salles_classe_total INTEGER DEFAULT 0 CHECK (salles_classe_total >= 0),

  -- Infrastructures (booléens)
  toilettes_filles_fonctionnelles BOOLEAN DEFAULT false,
  eau_potable BOOLEAN DEFAULT false,
  electricite BOOLEAN DEFAULT false,
  mobilier_scolaire BOOLEAN DEFAULT false,
  bibliotheca BOOLEAN DEFAULT false,
  laboratoire BOOLEAN DEFAULT false,
  terrain_sport BOOLEAN DEFAULT false,
  materiaux_precaires TEXT[] DEFAULT '{}',

  -- Inventaire par classe (JSONB pour flexibilité)
  inventaire_classes JSONB DEFAULT '[]'::jsonb,
  -- Exemple: [
  --   {"classe": "CP1", "filles": 25, "garcons": 30, "bancs_actifs": 20, "besoin_bancs": 16, "derniere_mise_a_jour": "2026-09-05"}
  -- ]

  -- Statut de collecte
  collect_status TEXT DEFAULT 'pending'
    CHECK (collect_status IN ('collected', 'waiting', 'pending')),
  last_collecte_at TIMESTAMPTZ,

  -- Métadonnées
  photo_url TEXT,
  commentaires TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_ecoles_commune ON public.ecoles(commune_code);
CREATE INDEX IF NOT EXISTS idx_ecoles_region ON public.ecoles(region_code);
CREATE INDEX IF NOT EXISTS idx_ecoles_district ON public.ecoles(district_code);
CREATE INDEX IF NOT EXISTS idx_ecoles_statut ON public.ecoles(statut);
CREATE INDEX IF NOT EXISTS idx_ecoles_collect_status ON public.ecoles(collect_status);
CREATE INDEX IF NOT EXISTS idx_ecoles_geom ON public.ecoles USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_ecoles_inventaire ON public.ecoles USING GIN(inventaire_classes);

-- RLS: lecture publique, écriture authentifiée
ALTER TABLE public.ecoles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique des écoles" ON public.ecoles;
CREATE POLICY "Lecture publique des écoles"
  ON public.ecoles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Enquêteur crée/modifie ses collectes" ON public.ecoles;
CREATE POLICY "Enquêteur crée/modifie ses collectes"
  ON public.ecoles FOR ALL
  USING (
    auth.role() = 'authenticated'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'enqueteur')
      )
    )
  );

DROP POLICY IF EXISTS "Admin gère tout" ON public.ecoles;
CREATE POLICY "Admin gère tout"
  ON public.ecoles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- TABLE: collectes (historique des visites terrain)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.collectes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ecole_id UUID REFERENCES public.ecoles(id) ON DELETE SET NULL,
  enqueteur_id UUID NOT NULL REFERENCES public.profiles(id),

  code_mena TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,

  district TEXT,
  region TEXT,
  departement TEXT,
  sous_prefecture TEXT,
  localite TEXT,
  milieu TEXT CHECK (milieu IN ('urbain', 'rural')),
  voie_acces TEXT CHECK (voie_acces IN ('goudron', 'piste_praticable', 'piste_saisonniere')),
  nom_ecole TEXT,
  statut_juridique TEXT CHECK (statut_juridique IN ('public', 'prive_laic', 'prive_confessionnel', 'communaute')),
  niveau_enseignement TEXT CHECK (niveau_enseignement IN ('primaire', 'secondaire', 'superieur')),
  annee_creation INTEGER,
  annee_scolaire TEXT,

  salles_fonctionnelles INTEGER,
  inventaire_classes JSONB NOT NULL DEFAULT '[]'::jsonb,

  nb_enseignants_presents INTEGER,
  deficit_enseignants BOOLEAN DEFAULT false,
  nb_enseignants_manquants INTEGER,
  classes_jumelees BOOLEAN,
  matieres_penurie JSONB,

  materiaux_batiment TEXT CHECK (materiaux_batiment IN ('parpaing_ciment', 'brique_terre', 'bois', 'boue_banco', 'paillote')),
  presence_cloture BOOLEAN,
  securite_routiere BOOLEAN,

  nb_latrines INTEGER,
  eau_potable BOOLEAN,
  source_eau_village TEXT CHECK (source_eau_village IN ('sodeci', 'forage_village', 'aucun')),
  localite_raccordee_elec BOOLEAN,
  ecole_electrifiee BOOLEAN,
  source_energie TEXT CHECK (source_energie IN ('reseau_cie', 'panneaux_solaires', 'groupe_electrogene')),
  poteau_100m BOOLEAN,
  cantine_fonctionnelle BOOLEAN,
  source_cantine TEXT CHECK (source_cantine IN ('unicef_pam', 'parents', 'collectivite')),

  photos JSONB DEFAULT '[]'::jsonb,
  commentaires TEXT,

  status TEXT DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'validated', 'rejected')),

  date_collecte TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_collectes_ecole ON public.collectes(ecole_id);
CREATE INDEX IF NOT EXISTS idx_collectes_enqueteur ON public.collectes(enqueteur_id);
CREATE INDEX IF NOT EXISTS idx_collectes_date ON public.collectes(date_collecte);

ALTER TABLE public.collectes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enquêteur voit ses collectes" ON public.collectes;
CREATE POLICY "Enquêteur voit ses collectes"
  ON public.collectes FOR SELECT
  USING (enqueteur_id = auth.uid());

DROP POLICY IF EXISTS "Enquêteur crée des collectes" ON public.collectes;
CREATE POLICY "Enquêteur crée des collectes"
  ON public.collectes FOR INSERT
  WITH CHECK (enqueteur_id = auth.uid());

DROP POLICY IF EXISTS "Admin voit toutes les collectes" ON public.collectes;
CREATE POLICY "Admin voit toutes les collectes"
  ON public.collectes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- TABLE: dossiers_institutions (projets B2B)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dossiers_institutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES public.profiles(id),
  titre TEXT NOT NULL,
  description TEXT,
  type_projet TEXT NOT NULL CHECK (type_projet IN ('etude', 'audit', 'infrastructure', 'autre')),
  statut TEXT DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'soumis', 'en_cours', 'termine')),
  ecoles_ciblees UUID[] DEFAULT '{}',
  budget_fcfa NUMERIC(15, 2),
  date_debut DATE,
  date_fin DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.dossiers_institutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Institution gère ses dossiers" ON public.dossiers_institutions;
CREATE POLICY "Institution gère ses dossiers"
  ON public.dossiers_institutions FOR ALL
  USING (institution_id = auth.uid());

DROP POLICY IF EXISTS "Admin voit tous les dossiers" ON public.dossiers_institutions;
CREATE POLICY "Admin voit tous les dossiers"
  ON public.dossiers_institutions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- TABLE: abonnements_mairies (SaaS B2G)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.abonnements_mairies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commune_code TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'pro', 'premium')),
  statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'expire', 'suspendu')),
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  montant_fcfa NUMERIC(12, 2) NOT NULL,
  mode_paiement TEXT CHECK (mode_paiement IN ('mobile_money', 'virement', 'cheque')),
  reference_paiement TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.abonnements_mairies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mairie voit son abonnement" ON public.abonnements_mairies;
CREATE POLICY "Mairie voit son abonnement"
  ON public.abonnements_mairies FOR SELECT
  USING (
    commune_code = (
      SELECT commune_code FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ============================================================
-- TRIGGER: maj updated_at automatiquement
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_ecoles_updated_at ON public.ecoles;
CREATE TRIGGER trigger_ecoles_updated_at
  BEFORE UPDATE ON public.ecoles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_dossiers_updated_at ON public.dossiers_institutions;
CREATE TRIGGER trigger_dossiers_updated_at
  BEFORE UPDATE ON public.dossiers_institutions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- VUE: Statistiques par commune (pour le dashboard)
-- ============================================================
CREATE OR REPLACE VIEW public.v_stats_communes AS
SELECT
  commune_code,
  COUNT(*) AS total_ecoles,
  SUM(nombre_filles) AS total_filles,
  SUM(nombre_garcons) AS total_garcons,
  SUM(eleves_total) AS total_eleves,
  SUM(enseignants_presents) AS total_enseignants,
  ROUND(
    CASE WHEN SUM(eleves_total) > 0
      THEN (SUM(nombre_filles)::NUMERIC / SUM(eleves_total) * 100)
      ELSE 0
    END, 1
  ) AS taux_filles_pct,
  SUM(CASE WHEN collect_status = 'collected' THEN 1 ELSE 0 END) AS ecoles_collectees,
  SUM(CASE WHEN collect_status = 'waiting' THEN 1 ELSE 0 END) AS ecoles_en_attente,
  SUM(CASE WHEN collect_status = 'pending' THEN 1 ELSE 0 END) AS ecoles_non_programmees
FROM public.ecoles
GROUP BY commune_code;

-- ============================================================
-- VUE: Écoles avec inventaire (pour le détail)
-- ============================================================
CREATE OR REPLACE VIEW public.v_ecoles_inventaire AS
SELECT
  e.*,
  (
    SELECT SUM((elem->>'besoin_bancs')::int)
    FROM jsonb_array_elements(e.inventaire_classes) AS elem
    WHERE (elem->>'besoin_bancs')::int > 0
  ) AS total_besoin_bancs,
  (
    SELECT SUM((elem->>'filles')::int + (elem->>'garcons')::int)
    FROM jsonb_array_elements(e.inventaire_classes) AS elem
  ) AS eleves_inventories
FROM public.ecoles e;

-- ============================================================
-- Permissions Realtime (pour les mises à jour en temps réel)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'ecoles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ecoles;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'collectes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.collectes;
  END IF;
END $$;
