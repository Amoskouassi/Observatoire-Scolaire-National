import { Router } from 'express';
import { supabase } from '../server.js';

const router = Router();

// Stats globales pour le dashboard
router.get('/stats/:level/:code?', async (req, res, next) => {
  try {
    const { level, code } = req.params;

    let query = supabase.from('ecoles').select('*');

    if (code) {
      const columnMap = {
        district: 'district_code',
        region: 'region_code',
        departement: 'departement_code',
        commune: 'commune_code',
      };
      if (columnMap[level]) {
        query = query.eq(columnMap[level], code);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    // Stats par collect_status
    const byStatus = {
      collected: data.filter((e) => e.collect_status === 'collected').length,
      waiting: data.filter((e) => e.collect_status === 'waiting').length,
      pending: data.filter((e) => e.collect_status === 'pending').length,
    };

    // Évolution temporelle (derniers 12 mois)
    const now = new Date();
    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = month.toISOString().slice(0, 7);
      const count = data.filter((e) =>
        e.last_collecte_at && e.last_collecte_at.startsWith(monthStr)
      ).length;
      monthlyData.push({
        month: monthStr,
        label: month.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        count,
      });
    }

    // Stats infrastructure
    const infraStats = {
      sans_toilettes: data.filter((e) => !e.toilettes_filles_fonctionnelles).length,
      sans_eau: data.filter((e) => !e.eau_potable).length,
      sans_electricite: data.filter((e) => !e.electricite).length,
      materiaux_precaires: data.filter((e) => e.materiaux_precaires?.length > 0).length,
      besoin_bancs: data.reduce((sum, e) => {
        const inv = e.inventaire_classes || [];
        return sum + inv.reduce((s, c) => s + (c.besoin_bancs || 0), 0);
      }, 0),
    };

    // Parité par niveau
    const parityByLevel = {};
    for (const ecole of data) {
      const level = ecole.niveau_enseignement || 'inconnu';
      if (!parityByLevel[level]) {
        parityByLevel[level] = { filles: 0, garcons: 0 };
      }
      parityByLevel[level].filles += ecole.nombre_filles || 0;
      parityByLevel[level].garcons += ecole.nombre_garcons || 0;
    }

    res.json({
      total_ecoles: data.length,
      by_status: byStatus,
      monthly: monthlyData,
      infrastructure: infraStats,
      parity_by_level: parityByLevel,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
