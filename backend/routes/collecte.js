import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../server.js';
import { validateRequest } from '../middleware/validate.js';
import { sendMail, collecteReceivedEmail } from '../services/email.js';

const router = Router();

const collecteSchema = z.object({
  code_mena: z.string().min(1),
  ecole_id: z.string().uuid().nullish(),
  latitude: z.number().min(4).max(11),
  longitude: z.number().min(-8.5).max(-2.5),

  district: z.string().nullish(),
  region: z.string().nullish(),
  departement: z.string().nullish(),
  sous_prefecture: z.string().nullish(),
  localite: z.string().nullish(),
  milieu: z.enum(['urbain', 'rural']).nullish(),
  voie_acces: z.enum(['goudron', 'piste_praticable', 'piste_saisonniere']).nullish(),
  nom_ecole: z.string().nullish(),
  statut_juridique: z.enum(['public', 'prive_laic', 'prive_confessionnel', 'communaute']).nullish(),
  niveau_enseignement: z.enum(['primaire', 'secondaire', 'superieur']).nullish(),
  annee_creation: z.number().int().min(1900).max(2030).nullish(),
  annee_scolaire: z.string().nullish(),

  salles_fonctionnelles: z.number().int().min(0).nullish(),
  inventaire_classes: z.array(z.object({
    classe: z.string().nullish(),
    filles: z.number().int().min(0),
    garcons: z.number().int().min(0),
    bancs_actifs: z.number().int().min(0),
    besoin_bancs: z.number().int().min(0),
    enseignants: z.number().int().min(0).nullish(),
  })).nullish(),

  nb_enseignants_presents: z.number().int().min(0).nullish(),
  deficit_enseignants: z.boolean().nullish(),
  nb_enseignants_manquants: z.number().int().min(0).nullish(),
  classes_jumelees: z.boolean().nullish(),
  matieres_penurie: z.array(z.string()).nullish(),

  materiaux_batiment: z.enum(['parpaing_ciment', 'brique_terre', 'bois', 'boue_banco', 'paillote']).nullish(),
  presence_cloture: z.boolean().nullish(),
  securite_routiere: z.boolean().nullish(),

  nb_latrines: z.number().int().min(0).nullish(),
  eau_potable: z.boolean().nullish(),
  source_eau_village: z.enum(['sodeci', 'forage_village', 'aucun']).nullish(),
  localite_raccordee_elec: z.boolean().nullish(),
  ecole_electrifiee: z.boolean().nullish(),
  source_energie: z.enum(['reseau_cie', 'panneaux_solaires', 'groupe_electrogene']).nullish(),
  poteau_100m: z.boolean().nullish(),
  cantine_fonctionnelle: z.boolean().nullish(),
  source_cantine: z.enum(['unicef_pam', 'parents', 'collectivite']).nullish(),

  photos: z.array(z.object({
    url: z.string(),
    type: z.string(),
  })).max(5).nullish(),
  commentaires: z.string().max(2000).nullish(),
  date_collecte: z.string().nullish(),
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

    // Si une école existe, mettre à jour son inventaire + photo
    let ecoleId = req.body.ecole_id;
    if (!ecoleId && req.body.code_mena && !req.body.code_mena.startsWith('TEMP-')) {
      const { data: ecole, error: ecoleErr } = await supabase
        .from('ecoles')
        .select('id')
        .eq('code_mena', req.body.code_mena)
        .single();
      if (!ecoleErr && ecole) ecoleId = ecole.id;
    }
    if (ecoleId) {
      const updateData = {
        inventaire_classes: req.body.inventaire_classes,
        updated_at: new Date().toISOString(),
        collect_status: 'collected',
        last_collecte_at: req.body.date_collecte,
      };
      if (req.body.photos && req.body.photos.length > 0) {
        updateData.photo_url = req.body.photos[0].url;
      }
      const { error: updateErr } = await supabase
        .from('ecoles')
        .update(updateData)
        .eq('id', ecoleId);
      if (updateErr) console.error('Erreur update école:', updateErr.message);
    }

    res.status(201).json({ id: data.id, status: 'submitted' });

    // Notification email aux décideurs de la zone
    try {
      const enqProfile = await supabase.from('profiles').select('nom, prenom').eq('id', req.user.id).single();
      const enqNom = enqProfile.data ? `${enqProfile.data.prenom} ${enqProfile.data.nom}` : 'Enquêteur';
      const nomEcole = req.body.nom_ecole || req.body.code_mena || 'École';
      const emailContent = collecteReceivedEmail(nomEcole, enqNom);

      const decRoleMap = { mairie: 'mairie', president_region: 'president_region', ministre: 'ministre' };
      const zoneCol = { mairie: 'commune_code', president_region: 'region_code', ministre: 'district_code' };

      for (const [role, col] of Object.entries(zoneCol)) {
        const zoneVal = req.body[col.replace('_code', '') === 'commune' ? 'sous_prefecture' : col.replace('_code', '')];
        if (zoneVal) {
          const { data: decs } = await supabase.from('profiles').select('email').eq('role', role);
          if (decs?.length) {
            for (const dec of decs) {
              if (dec.email) sendMail({ to: dec.email, ...emailContent }).catch(() => {});
            }
          }
        }
      }
    } catch (e) { /* notification best-effort */ }
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
