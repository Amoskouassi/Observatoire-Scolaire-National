import { Router } from 'express';
import { supabase } from '../server.js';

const router = Router();

// Générer une affiche de plaidoyer (texte simple pour le MVP)
router.get('/poster/:schoolId', async (req, res, next) => {
  try {
    const { data: ecole, error } = await supabase
      .from('ecoles')
      .select('id, code_mena, nom_etablissement, statut, niveau_enseignement, milieu_implantation, longitude, latitude, commune_code, departement_code, region_code, district_code, nombre_filles, nombre_garcons, eleves_total, enseignants_presents, salles_classe_total, toilettes_filles_fonctionnelles, eau_potable, electricite, materiaux_precaires, inventaire_classes, collect_status, last_collecte_at, photo_url')
      .eq('id', req.params.schoolId)
      .single();

    if (error || !ecole) {
      return res.status(404).json({ error: 'École non trouvée' });
    }

    // Calculer les besoins
    const inventaire = ecole.inventaire_classes || [];
    const totalBesoinBancs = inventaire.reduce((sum, c) => sum + (c.besoin_bancs || 0), 0);
    const totalEleves = ecole.nombre_filles + ecole.nombre_garcons;
    const tauxFilles = totalEleves > 0 ? Math.round((ecole.nombre_filles / totalEleves) * 100) : 0;

    const poster = {
      ecole: ecole.nom_etablissement,
      code: ecole.code_mena,
      localisation: `${ecole.commune_code}, Côte d'Ivoire`,
      statut: ecole.statut,
      milieu: ecole.milieu_implantation,
      effectifs: {
        filles: ecole.nombre_filles,
        garcons: ecole.nombre_garcons,
        total: totalEleves,
        taux_filles: `${tauxFilles}%`,
      },
      infrastructure: {
        salles: ecole.salles_classe_total,
        enseignants: ecole.enseignants_presents,
        ratio_eleve_salle: ecole.salles_classe_total > 0
          ? Math.round(totalEleves / ecole.salles_classe_total)
          : 'N/A',
        ratio_eleve_enseignant: ecole.enseignants_presents > 0
          ? Math.round(totalEleves / ecole.enseignants_presents)
          : 'N/A',
      },
      besoins: {
        bancs: totalBesoinBancs,
        toilettes: !ecole.toilettes_filles_fonctionnelles,
        eau: !ecole.eau_potable,
        electricite: !ecole.electricite,
      },
      date_generation: new Date().toISOString(),
    };

    res.json(poster);
  } catch (err) {
    next(err);
  }
});

export default router;
