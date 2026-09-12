import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../server.js';
import { config } from '../config/index.js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const router = Router();

// Dashboard personalisé pour l'utilisateur connecté
router.get('/my-zone', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Profil introuvable' });
    }

    const zoneColumn = profile.role === 'mairie' ? 'commune_code'
      : profile.role === 'president_region' ? 'region_code'
      : profile.role === 'ministre' ? 'district_code'
      : profile.district_code ? 'district_code'
      : profile.region_code ? 'region_code'
      : profile.departement_code ? 'departement_code'
      : 'commune_code';

    const zoneCode = profile[zoneColumn];

    if (!zoneCode) {
      return res.json({
        zone: null,
        stats: null,
        message: 'Aucune zone assignée. Contactez un administrateur.',
      });
    }

    const levelMap = {
      commune_code: 'commune',
      departement_code: 'departement',
      region_code: 'region',
      district_code: 'district',
    };

    const { data: ecoles, error } = await supabaseAdmin
      .from('ecoles')
      .select('id, code_mena, nom_etablissement, statut, niveau_enseignement, milieu_implantation, commune_code, departement_code, region_code, district_code, nombre_filles, nombre_garcons, enseignants_presents, salles_classe_total, toilettes_filles_fonctionnelles, eau_potable, electricite, materiaux_precaires, inventaire_classes, collect_status, last_collecte_at')
      .eq(zoneColumn, zoneCode);

    if (error) throw error;

    const data = ecoles || [];
    const total = data.length;

    const stats = {
      total_ecoles: total,
      total_eleves: data.reduce((s, e) => s + (e.nombre_filles || 0) + (e.nombre_garcons || 0), 0),
      total_filles: data.reduce((s, e) => s + (e.nombre_filles || 0), 0),
      total_garcons: data.reduce((s, e) => s + (e.nombre_garcons || 0), 0),
      total_enseignants: data.reduce((s, e) => s + (e.enseignants_presents || 0), 0),
      taux_filles_pct: total > 0
        ? Math.round(data.reduce((s, e) => s + (e.nombre_filles || 0), 0) / Math.max(1, data.reduce((s, e) => s + (e.nombre_filles || 0) + (e.nombre_garcons || 0), 0)) * 100)
        : 0,

      by_status: {
        collected: data.filter(e => e.collect_status === 'collected').length,
        waiting: data.filter(e => e.collect_status === 'waiting').length,
        pending: data.filter(e => e.collect_status === 'pending').length,
      },

      by_milieu: {
        urbain: data.filter(e => e.milieu_implantation === 'urbain').length,
        rural: data.filter(e => e.milieu_implantation === 'rural').length,
      },

      by_statut: {
        public: data.filter(e => e.statut === 'public').length,
        prive_laic: data.filter(e => e.statut === 'prive_laic').length,
        prive_confessionnel: data.filter(e => e.statut === 'prive_confessionnel').length,
      },

      by_niveau: {
        maternelle: data.filter(e => e.niveau_enseignement === 'maternelle').length,
        primaire: data.filter(e => e.niveau_enseignement === 'primaire').length,
        secondaire: data.filter(e => e.niveau_enseignement === 'secondaire').length,
      },

      infrastructure: {
        sans_toilettes: data.filter(e => !e.toilettes_filles_fonctionnelles).length,
        sans_eau: data.filter(e => !e.eau_potable).length,
        sans_electricite: data.filter(e => !e.electricite).length,
        materiaux_precaires: data.filter(e => e.materiaux_precaires?.length > 0).length,
        besoin_bancs: data.reduce((s, e) => {
          const inv = e.inventaire_classes || [];
          return s + inv.reduce((sum, c) => sum + (c.besoin_bancs || 0), 0);
        }, 0),
      },

      top_ecoles_besoin: data
        .map(e => ({
          id: e.id,
          nom: e.nom_etablissement,
          eleves: (e.nombre_filles || 0) + (e.nombre_garcons || 0),
          besoins: (e.inventaire_classes || []).reduce((s, c) => s + (c.besoin_bancs || 0), 0),
          sans_eau: !e.eau_potable,
          sans_toilettes: !e.toilettes_filles_fonctionnelles,
        }))
        .sort((a, b) => b.besoins - a.besoins)
        .slice(0, 10),
    };

    res.json({
      zone: {
        level: levelMap[zoneColumn],
        code: zoneCode,
        column: zoneColumn,
      },
      user: {
        nom: profile.nom,
        prenom: profile.prenom,
        role: profile.role,
        organisation: profile.organisation,
      },
      stats,
    });
  } catch (err) {
    next(err);
  }
});

// Stats globales pour le dashboard
router.get('/stats/:level/:code?', async (req, res, next) => {
  try {
    const { level, code } = req.params;

    let query = supabaseAdmin.from('ecoles').select('id, code_mena, nom_etablissement, statut, niveau_enseignement, milieu_implantation, commune_code, departement_code, region_code, district_code, nombre_filles, nombre_garcons, eleves_total, enseignants_presents, salles_classe_total, toilettes_filles_fonctionnelles, eau_potable, electricite, materiaux_precaires, inventaire_classes, collect_status, last_collecte_at');

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

router.get('/zone-counts', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('ecoles')
      .select('district_code, region_code, departement_code, commune_code, nombre_filles, nombre_garcons, collect_status, milieu_implantation, niveau_enseignement, statut');
    if (error) throw error;

    const schools = data || [];
    const agg = (list) => ({
      schools: list.length,
      students: list.reduce((s, e) => s + (e.nombre_filles || 0) + (e.nombre_garcons || 0), 0),
      girls: list.reduce((s, e) => s + (e.nombre_filles || 0), 0),
      boys: list.reduce((s, e) => s + (e.nombre_garcons || 0), 0),
      collected: list.filter(e => e.collect_status === 'collected').length,
      waiting: list.filter(e => e.collect_status === 'waiting').length,
      pending: list.filter(e => e.collect_status === 'pending').length,
    });

    const byDistrict = {}, byRegion = {}, byDept = {}, byCommune = {};
    for (const s of schools) {
      const d = s.district_code, r = s.region_code, dp = s.departement_code, c = s.commune_code;
      if (d) { if (!byDistrict[d]) byDistrict[d] = []; byDistrict[d].push(s); }
      if (r) { if (!byRegion[r]) byRegion[r] = []; byRegion[r].push(s); }
      if (dp) { if (!byDept[dp]) byDept[dp] = []; byDept[dp].push(s); }
      if (c) { if (!byCommune[c]) byCommune[c] = []; byCommune[c].push(s); }
    }

    const result = (obj) => { const out = {}; for (const [k, v] of Object.entries(obj)) out[k] = agg(v); return out; };

    res.json({
      national: agg(schools),
      by_district: result(byDistrict),
      by_region: result(byRegion),
      by_departement: result(byDept),
      by_commune: result(byCommune),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
