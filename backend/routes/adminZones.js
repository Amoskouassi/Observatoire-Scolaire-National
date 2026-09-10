import { Router } from 'express';
import { supabase } from '../server.js';

const router = Router();

// Statistiques par zone admin (agrégation serveur pour le sidebar)
router.get('/:level/:code', async (req, res, next) => {
  try {
    const { level, code } = req.params;

    // Mapper le niveau vers la colonne de code
    const codeColumnMap = {
      district: 'district_code',
      region: 'region_code',
      departement: 'departement_code',
      commune: 'commune_code',
    };

    const column = codeColumnMap[level];
    if (!column) {
      return res.status(400).json({ error: 'Niveau invalide' });
    }

    // Agréger les stats
    const { data, error } = await supabase
      .from('ecoles')
      .select(`
        statut,
        milieu_implantation,
        niveau_enseignement,
        nombre_filles,
        nombre_garcons,
        eleves_total,
        enseignants_presents,
        salles_classe_total,
        toilettes_filles_fonctionnelles,
        eau_potable,
        electricite,
        inventaire_classes
      `)
      .eq(column, code);

    if (error) throw error;

    const stats = computeStats(data);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

function computeStats(ecoles) {
  if (!ecoles.length) {
    return {
      total_ecoles: 0,
      total_eleves: 0,
      total_filles: 0,
      total_garcons: 0,
      total_enseignants: 0,
      total_salles: 0,
      taux_filles_pct: 0,
      taux_rural_pct: 0,
      taux_public_pct: 0,
      taux_secondaire_pct: 0,
      besoins: {
        sans_toilettes: 0,
        sans_eau: 0,
        sans_electricite: 0,
        materiaux_precaires: 0,
      },
      par_milieu: {},
      par_statut: {},
      par_niveau: {},
      par_collect_status: {},
    };
  }

  const total = ecoles.length;
  const totalFilles = ecoles.reduce((s, e) => s + (e.nombre_filles || 0), 0);
  const totalGarcons = ecoles.reduce((s, e) => s + (e.nombre_garcons || 0), 0);
  const totalEleves = ecoles.reduce((s, e) => s + (e.eleves_total || 0), 0);
  const totalEnseignants = ecoles.reduce((s, e) => s + (e.enseignants_presents || 0), 0);
  const totalSalles = ecoles.reduce((s, e) => s + (e.salles_classe_total || 0), 0);

  const countBy = (key) => ecoles.reduce((acc, e) => {
    const val = e[key] || 'inconnu';
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});

  return {
    total_ecoles: total,
    total_eleves: totalEleves,
    total_filles: totalFilles,
    total_garcons: totalGarcons,
    total_enseignants: totalEnseignants,
    total_salles: totalSalles,
    taux_filles_pct: totalEleves > 0 ? Math.round((totalFilles / totalEleves) * 100) : 0,
    taux_rural_pct: Math.round((ecoles.filter((e) => e.milieu_implantation === 'rural').length / total) * 100),
    taux_public_pct: Math.round((ecoles.filter((e) => e.statut === 'public').length / total) * 100),
    taux_secondaire_pct: Math.round((ecoles.filter((e) => e.niveau_enseignement === 'secondaire').length / total) * 100),
    besoins: {
      sans_toilettes: ecoles.filter((e) => !e.toilettes_filles_fonctionnelles).length,
      sans_eau: ecoles.filter((e) => !e.eau_potable).length,
      sans_electricite: ecoles.filter((e) => !e.electricite).length,
      materiaux_precaires: ecoles.filter((e) => e.materiaux_precaires?.length > 0).length,
    },
    par_milieu: countBy('milieu_implantation'),
    par_statut: countBy('statut'),
    par_niveau: countBy('niveau_enseignement'),
    par_collect_status: countBy('collect_status'),
  };
}

export default router;
