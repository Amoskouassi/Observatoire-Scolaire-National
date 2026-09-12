import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../server.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

const ecoleSchema = z.object({
  code_mena: z.string().min(1),
  nom_etablissement: z.string().min(2),
  statut: z.enum(['public', 'prive_laic', 'prive_confessionnel', 'communautaire_non_reconnue']),
  niveau_enseignement: z.enum(['primaire', 'secondaire', 'maternelle', 'superieur']),
  milieu_implantation: z.enum(['urbain', 'rural']),
  categorie: z.string().optional(),
  type_genre: z.string().optional(),
  annee_creation: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  longitude: z.number().min(-8.5).max(-2.5),
  latitude: z.number().min(4).max(11),
  commune_code: z.string().min(1),
  departement_code: z.string().optional(),
  region_code: z.string().optional(),
  district_code: z.string().optional(),
  nombre_filles: z.number().int().min(0).optional(),
  nombre_garcons: z.number().int().min(0).optional(),
  eleves_total: z.number().int().min(0).optional(),
  enseignants_presents: z.number().int().min(0).optional(),
  salles_classe_total: z.number().int().min(0).optional(),
  inventaire_classes: z.array(z.any()).optional(),
  photo_url: z.string().url().optional(),
});

// Liste publique des écoles (filtres côté client via MapLibre)
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('ecoles')
      .select('id, code_mena, nom_etablissement, statut, niveau_enseignement, milieu_implantation, categorie, type_genre, annee_creation, longitude, latitude, commune_code, departement_code, region_code, district_code, nombre_filles, nombre_garcons, eleves_total, enseignants_presents, salles_classe_total, toilettes_filles_fonctionnelles, eau_potable, electricite, mobilier_scolaire, bibliotheca, laboratoire, terrain_sport, materiaux_precaires, inventaire_classes, collect_status, last_collecte_at, photo_url, commentaires')
      .order('nom_etablissement');

    if (error) throw error;

    const geojson = {
      type: 'FeatureCollection',
      features: (data || []).map((e) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [e.longitude, e.latitude],
        },
        properties: { ...e },
      })),
    };

    res.json(geojson);
  } catch (err) {
    next(err);
  }
});

// Détail d'une école
router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('ecoles')
      .select('id, code_mena, nom_etablissement, statut, niveau_enseignement, milieu_implantation, categorie, type_genre, annee_creation, longitude, latitude, commune_code, departement_code, region_code, district_code, nombre_filles, nombre_garcons, eleves_total, enseignants_presents, salles_classe_total, toilettes_filles_fonctionnelles, eau_potable, electricite, mobilier_scolaire, bibliotheca, laboratoire, terrain_sport, materiaux_precaires, inventaire_classes, collect_status, last_collecte_at, photo_url, commentaires')
      .eq('id', req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'École non trouvée' });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Créer une école (admin/enqueteur)
router.post('/', authMiddleware, requireRole('admin', 'enqueteur'), validateRequest(ecoleSchema), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('ecoles')
      .insert(req.body)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// Modifier une école
router.put('/:id', authMiddleware, requireRole('admin', 'enqueteur'), validateRequest(ecoleSchema.partial()), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('ecoles')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Supprimer une école (admin seulement)
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('ecoles')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'École supprimée' });
  } catch (err) {
    next(err);
  }
});

export default router;
