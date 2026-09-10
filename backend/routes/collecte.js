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
  photos: z.array(z.object({
    url: z.string().url(),
    type: z.string(),
  })).max(5),
  inventaire_classes: z.array(z.object({
    classe: z.string(),
    filles: z.number().int().min(0),
    garcons: z.number().int().min(0),
    bancs_actifs: z.number().int().min(0),
    besoin_bancs: z.number().int().min(0),
    enseignants: z.number().int().min(0).optional(),
  })),
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
