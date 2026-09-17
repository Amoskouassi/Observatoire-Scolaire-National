import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../server.js';
import { requireRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { sendMail, collecteReceivedEmail } from '../services/email.js';

const router = Router();

const collecteSchema = z.object({
  code_mena: z.string().min(1),
  ecole_id: z.string().uuid().nullish(),
  latitude: z.number().min(4).max(11),
  longitude: z.number().min(-8.5).max(-2.5),

  district: z.string().nullish(),
  district_code: z.string().nullish(),
  region: z.string().nullish(),
  region_code: z.string().nullish(),
  departement: z.string().nullish(),
  departement_code: z.string().nullish(),
  sous_prefecture: z.string().nullish(),
  commune_code: z.string().nullish(),
  localite: z.string().nullish(),
  milieu: z.enum(['urbain', 'rural']).nullish(),
  voie_acces: z.enum(['goudron', 'piste_praticable', 'piste_saisonniere']).nullish(),
  nom_ecole: z.string().nullish(),
  statut_juridique: z.enum(['public', 'prive_laic', 'prive_confessionnel', 'communaute']).nullish(),
  niveau_enseignement: z.enum(['primaire', 'secondaire', 'maternelle', 'superieur']).nullish(),
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
  toilettes_separees_garcons_filles: z.boolean().nullish(),
  toilettes_separees_hommes_femmes: z.boolean().nullish(),
  eau_potable: z.boolean().nullish(),
  source_eau_village: z.enum(['sodeci', 'pompe_villageoise', 'puits', 'forage', 'marigot']).nullish(),
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
      code_mena: req.body.code_mena,
      ecole_id: req.body.ecole_id,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      district: req.body.district,
      region: req.body.region,
      departement: req.body.departement,
      sous_prefecture: req.body.sous_prefecture,
      localite: req.body.localite,
      milieu: req.body.milieu,
      voie_acces: req.body.voie_acces,
      nom_ecole: req.body.nom_ecole,
      statut_juridique: req.body.statut_juridique,
      niveau_enseignement: req.body.niveau_enseignement,
      annee_creation: req.body.annee_creation,
      annee_scolaire: req.body.annee_scolaire,
      salles_fonctionnelles: req.body.salles_fonctionnelles,
      inventaire_classes: req.body.inventaire_classes,
      nb_enseignants_presents: req.body.nb_enseignants_presents,
      deficit_enseignants: req.body.deficit_enseignants,
      nb_enseignants_manquants: req.body.nb_enseignants_manquants,
      classes_jumelees: req.body.classes_jumelees,
      matieres_penurie: req.body.matieres_penurie,
      materiaux_batiment: req.body.materiaux_batiment,
      presence_cloture: req.body.presence_cloture,
      securite_routiere: req.body.securite_routiere,
      nb_latrines: req.body.nb_latrines,
      toilettes_separees_garcons_filles: req.body.toilettes_separees_garcons_filles,
      toilettes_separees_hommes_femmes: req.body.toilettes_separees_hommes_femmes,
      eau_potable: req.body.eau_potable,
      source_eau_village: req.body.source_eau_village,
      localite_raccordee_elec: req.body.localite_raccordee_elec,
      ecole_electrifiee: req.body.ecole_electrifiee,
      source_energie: req.body.source_energie,
      poteau_100m: req.body.poteau_100m,
      cantine_fonctionnelle: req.body.cantine_fonctionnelle,
      source_cantine: req.body.source_cantine,
      photos: req.body.photos,
      commentaires: req.body.commentaires,
      date_collecte: req.body.date_collecte,
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
    let createErr = null;

    if (ecoleId) {
      const updateData = {
        inventaire_classes: req.body.inventaire_classes,
        updated_at: new Date().toISOString(),
        collect_status: 'collected',
        last_collecte_at: req.body.date_collecte,
      };
      if (req.body.eau_potable != null) updateData.eau_potable = req.body.eau_potable;
      if (req.body.ecole_electrifiee != null) updateData.electricite = req.body.ecole_electrifiee;
      if (req.body.nb_latrines != null) updateData.toilettes_filles_fonctionnelles = req.body.nb_latrines > 0;
      if (req.body.toilettes_separees_garcons_filles != null) updateData.toilettes_separees_garcons_filles = req.body.toilettes_separees_garcons_filles;
      if (req.body.toilettes_separees_hommes_femmes != null) updateData.toilettes_separees_hommes_femmes = req.body.toilettes_separees_hommes_femmes;
      if (req.body.presence_cloture != null) updateData.cloturee = req.body.presence_cloture;
      if (req.body.materiaux_batiment) updateData.materiaux_precaires = [req.body.materiaux_batiment];
      if (req.body.nb_enseignants_presents != null) updateData.enseignants_presents = req.body.nb_enseignants_presents;
      if (req.body.inventaire_classes && req.body.inventaire_classes.length > 0) {
        updateData.besoin_bancs = req.body.inventaire_classes.reduce((sum, c) => sum + (c.besoin_bancs || 0), 0);
      }
      if (req.body.photos && req.body.photos.length > 0) {
        updateData.photo_url = req.body.photos[0].url;
      }
      const { error: updateErr } = await supabase
        .from('ecoles')
        .update(updateData)
        .eq('id', ecoleId);
      if (updateErr) console.error('Erreur update école:', updateErr.message, updateErr);
    } else if (req.body.latitude && req.body.longitude) {
      const STATUT_MAP = { communaute: 'communautaire_non_reconnue' };
      const newEcole = {
        code_mena: req.body.code_mena || 'TEMP-' + Date.now(),
        nom_etablissement: req.body.nom_ecole || 'École collectée',
        statut: STATUT_MAP[req.body.statut_juridique] || req.body.statut_juridique || 'public',
        niveau_enseignement: req.body.niveau_enseignement || 'primaire',
        milieu_implantation: req.body.milieu || 'rural',
        longitude: req.body.longitude,
        latitude: req.body.latitude,
        commune_code: req.body.commune_code || req.body.sous_prefecture || 'INCONNU',
        departement_code: req.body.departement_code || req.body.departement || null,
        region_code: req.body.region_code || req.body.region || null,
        district_code: req.body.district_code || req.body.district || null,
        collect_status: 'collected',
        last_collecte_at: req.body.date_collecte,
        inventaire_classes: req.body.inventaire_classes || [],
        enseignants_presents: req.body.nb_enseignants_presents || 0,
        eau_potable: req.body.eau_potable || false,
        electricite: req.body.ecole_electrifiee || false,
        toilettes_filles_fonctionnelles: (req.body.nb_latrines || 0) > 0,
        toilettes_separees_garcons_filles: req.body.toilettes_separees_garcons_filles || false,
        toilettes_separees_hommes_femmes: req.body.toilettes_separees_hommes_femmes || false,
        cloturee: req.body.presence_cloture || false,
        materiaux_precaires: req.body.materiaux_batiment ? [req.body.materiaux_batiment] : [],
        besoin_bancs: req.body.inventaire_classes ? req.body.inventaire_classes.reduce((sum, c) => sum + (c.besoin_bancs || 0), 0) : 0,
        photo_url: req.body.photos?.[0]?.url || null,
      };
      const { data: created, error: createErrInner } = await supabase
        .from('ecoles')
        .insert(newEcole)
        .select('id')
        .single();
      if (createErrInner) {
        createErr = createErrInner;
        console.error('Erreur création école:', createErr.message, createErr);
      } else {
        ecoleId = created.id;
      }
    }

    res.status(201).json({ id: data.id, status: 'submitted', ecole_id: ecoleId || null });

    // Notification email aux décideurs de la zone
    try {
      const enqProfile = await supabase.from('profiles').select('nom, prenom').eq('id', req.user.id).single();
      const enqNom = enqProfile.data ? `${enqProfile.data.prenom} ${enqProfile.data.nom}` : 'Enquêteur';
      const nomEcole = req.body.nom_ecole || req.body.code_mena || 'École';
      const emailContent = collecteReceivedEmail(nomEcole, enqNom, {
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        ecoleId: ecoleId,
      });

      const decRoleMap = { mairie: 'mairie', president_region: 'president_region', ministre: 'ministre' };
      const zoneCol = { mairie: 'commune_code', president_region: 'region_code', ministre: 'district_code' };

      for (const [role, col] of Object.entries(zoneCol)) {
        const zoneVal = req.body[col.replace('_code', '') === 'commune' ? 'sous_prefecture' : col.replace('_code', '')];
        if (zoneVal) {
          const { data: decs } = await supabase.from('profiles').select('email').eq('role', role).eq(col, zoneVal);
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
router.get('/historique', requireRole('admin', 'ministre'), async (req, res, next) => {
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
