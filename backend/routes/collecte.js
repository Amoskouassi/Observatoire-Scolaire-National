import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../server.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

const collecteSchema = z.object({
  code_mena: z.string().min(1),
  ecole_id: z.string().uuid().optional(),
  latitude: z.number().min(-8.5).max(-2.5),
  longitude: z.number().min(4).max(11),

  district: z.string().optional(),
  region: z.string().optional(),
  departement: z.string().optional(),
  sous_prefecture: z.string().optional(),
  localite: z.string().optional(),
  milieu: z.enum(['urbain', 'rural']).optional(),
  voie_acces: z.enum(['goudron', 'piste_praticable', 'piste_saisonniere']).optional(),
  nom_ecole: z.string().optional(),
  statut_juridique: z.enum(['public', 'prive_laic', 'prive_confessionnel', 'communaute']).optional(),
  niveau_enseignement: z.enum(['primaire', 'secondaire', 'superieur']).optional(),
  annee_creation: z.number().int().min(1900).max(2030).optional(),
  annee_scolaire: z.string().optional(),

  salles_fonctionnelles: z.number().int().min(0).optional(),
  inventaire_classes: z.array(z.object({
    classe: z.string(),
    filles: z.number().int().min(0),
    garcons: z.number().int().min(0),
    bancs_actifs: z.number().int().min(0),
    besoin_bancs: z.number().int().min(0),
    enseignants: z.number().int().min(0).optional(),
  })),

  nb_enseignants_presents: z.number().int().min(0).optional(),
  deficit_enseignants: z.boolean().optional(),
  nb_enseignants_manquants: z.number().int().min(0).optional(),
  classes_jumelees: z.boolean().optional(),
  matieres_penurie: z.array(z.string()).optional(),

  materiaux_batiment: z.enum(['parpaing_ciment', 'brique_terre', 'bois', 'boue_banco', 'paillote']).optional(),
  presence_cloture: z.boolean().optional(),
  securite_routiere: z.boolean().optional(),

  nb_latrines: z.number().int().min(0).optional(),
  eau_potable: z.boolean().optional(),
  source_eau_village: z.enum(['sodeci', 'forage_village', 'aucun']).optional(),
  localite_raccordee_elec: z.boolean().optional(),
  ecole_electrifiee: z.boolean().optional(),
  source_energie: z.enum(['reseau_cie', 'panneaux_solaires', 'groupe_electrogene']).optional(),
  poteau_100m: z.boolean().optional(),
  cantine_fonctionnelle: z.boolean().optional(),
  source_cantine: z.enum(['unicef_pam', 'parents', 'collectivite']).optional(),

  photos: z.array(z.object({
    url: z.string(),
    type: z.string(),
  })).max(5).optional(),
  commentaires: z.string().max(2000).optional(),
  date_collecte: z.string().datetime(),
});

// Soumettre une collecte
router.post('/', validateRequest(collecteSchema), async (req, res, next) => {
  try {
    const collecteData = {
      ...req.body,
      enqueteur_id: req.user.id,
      status: 'submitted',
    };

    const { data, error } = await supabase
      .from('collectes')
      .insert(collecteData)
      .select()
      .single();

    if (error) throw error;

    // Si une école existe, mettre à jour son inventaire
    if (req.body.ecole_id) {
      await supabase
        .from('ecoles')
        .update({
          inventaire_classes: req.body.inventaire_classes,
          updated_at: new Date().toISOString(),
          collect_status: 'collected',
          last_collecte_at: req.body.date_collecte,
        })
        .eq('id', req.body.ecole_id);
    }

    res.status(201).json({ id: data.id, status: 'submitted' });
  } catch (err) {
    next(err);
  }
});

// Historique des collectes (pour admin)
router.get('/historique', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('collectes')
      .select(`
        *,
        ecoles(nom_etablissement, code_mena),
        profiles(nom, prenom)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
