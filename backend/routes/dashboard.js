import { Router } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../server.js';
import { requireRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const router = Router();

// Dashboard personalisé pour l'utilisateur connecté
router.get('/my-zone', async (req, res, next) => {
  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
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
      total_eleves: data.reduce((s, e) => s + (e.nombre_filles || 0) + (e.nombre_garcons || 0), 0),
      total_filles: data.reduce((s, e) => s + (e.nombre_filles || 0), 0),
      total_garcons: data.reduce((s, e) => s + (e.nombre_garcons || 0), 0),
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
      .select('district_code, region_code, departement_code, commune_code, nombre_filles, nombre_garcons, collect_status');
    if (error) throw error;

    const schools = data || [];
    const agg = (list) => ({
      schools: list.length,
      students: list.reduce((s, e) => s + (e.nombre_filles || 0) + (e.nombre_garcons || 0), 0),
      girls: list.reduce((s, e) => s + (e.nombre_filles || 0), 0),
      boys: list.reduce((s, e) => s + (e.nombre_garcons || 0), 0),
    });

    const group = (list, key) => {
      const map = {};
      for (const s of list) {
        const k = s[key];
        if (k) { if (!map[k]) map[k] = []; map[k].push(s); }
      }
      return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, agg(v)]));
    };

    res.json({
      national: agg(schools),
      districts: group(schools, 'district_code'),
      regions: group(schools, 'region_code'),
      departements: group(schools, 'departement_code'),
      communes: group(schools, 'commune_code'),
    });
  } catch (err) {
    next(err);
  }
});

// Stats nationales pour comparaison
router.get('/national-stats', requireRole('admin', 'ministre'), async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('ecoles')
      .select('statut, niveau_enseignement, milieu_implantation, nombre_filles, nombre_garcons, enseignants_presents, toilettes_filles_fonctionnelles, eau_potable, electricite, materiaux_precaires, inventaire_classes, collect_status');
    if (error) throw error;
    const d = data || [];
    const total = d.length;
    const totalEleves = d.reduce((s, e) => s + (e.nombre_filles || 0) + (e.nombre_garcons || 0), 0);
    res.json({
      total_ecoles: total,
      total_eleves: totalEleves,
      total_filles: d.reduce((s, e) => s + (e.nombre_filles || 0), 0),
      total_enseignants: d.reduce((s, e) => s + (e.enseignants_presents || 0), 0),
      taux_filles_pct: totalEleves > 0 ? Math.round(d.reduce((s, e) => s + (e.nombre_filles || 0), 0) / totalEleves * 100) : 0,
      taux_collecte_pct: total > 0 ? Math.round(d.filter(e => e.collect_status === 'collected').length / total * 100) : 0,
      ratio_eleves_enseignant: d.reduce((s, e) => s + (e.enseignants_presents || 0), 0) > 0
        ? Math.round(totalEleves / d.reduce((s, e) => s + (e.enseignants_presents || 0), 0)) : 0,
      pct_milieu_urbain: total > 0 ? Math.round(d.filter(e => e.milieu_implantation === 'urbain').length / total * 100) : 0,
      pct_public: total > 0 ? Math.round(d.filter(e => e.statut === 'public').length / total * 100) : 0,
      pct_primaire: total > 0 ? Math.round(d.filter(e => e.niveau_enseignement === 'primaire').length / total * 100) : 0,
      pct_secondaire: total > 0 ? Math.round(d.filter(e => e.niveau_enseignement === 'secondaire').length / total * 100) : 0,
      infrastructure: {
        sans_eau: d.filter(e => !e.eau_potable).length,
        sans_toilettes: d.filter(e => !e.toilettes_filles_fonctionnelles).length,
        sans_electricite: d.filter(e => !e.electricite).length,
        materiaux_precaires: d.filter(e => e.materiaux_precaires?.length > 0).length,
        besoin_bancs: d.reduce((s, e) => s + (e.inventaire_classes || []).reduce((ss, c) => ss + (c.besoin_bancs || 0), 0), 0),
      },
      pct_sans_eau: total > 0 ? Math.round(d.filter(e => !e.eau_potable).length / total * 100) : 0,
      pct_sans_toilettes: total > 0 ? Math.round(d.filter(e => !e.toilettes_filles_fonctionnelles).length / total * 100) : 0,
      pct_sans_electricite: total > 0 ? Math.round(d.filter(e => !e.electricite).length / total * 100) : 0,
      pct_materiaux_precaires: total > 0 ? Math.round(d.filter(e => e.materiaux_precaires?.length > 0).length / total * 100) : 0,
    });
  } catch (err) { next(err); }
});

// Historique: stats d'une année scolaire spécifique (snapshot)
router.get('/historical', requireRole('admin', 'ministre'), async (req, res, next) => {
  try {
    const { annee_scolaire } = req.query;
    if (!annee_scolaire) return res.status(400).json({ error: 'annee_scolaire requise' });
    const { data, error } = await supabaseAdmin
      .from('snapshots')
      .select('*')
      .eq('annee_scolaire', annee_scolaire);
    if (error) throw error;
    res.json(data || []);
  } catch (err) { next(err); }
});

// Sauvegarder un snapshot
const snapshotSchema = z.object({
  zone_level: z.enum(['district', 'region', 'departement', 'commune']),
  zone_code: z.string().min(1),
  annee_scolaire: z.string().min(1),
  stats: z.object({}).passthrough(),
});

router.post('/snapshots', requireRole('admin', 'ministre'), validateRequest(snapshotSchema), async (req, res, next) => {
  try {
    const { zone_level, zone_code, annee_scolaire, stats } = req.body;
    const { data, error } = await supabaseAdmin
      .from('snapshots')
      .upsert({ zone_level, zone_code, annee_scolaire, ...stats }, { onConflict: 'zone_level,zone_code,annee_scolaire' })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

// Historique des collectes par année scolaire
router.get('/collecte-history', requireRole('admin', 'ministre'), async (req, res, next) => {
  try {
    let query = supabaseAdmin.from('collectes').select('id, created_at, date_collecte, enqueteur_id, ecole_id, ecoles(nom_etablissement, code_mena, commune_code, region_code, district_code)');
    const { data, error } = await query.order('date_collecte', { ascending: false }).limit(500);
    if (error) throw error;
    const collects = data || [];
    const byYear = {};
    for (const c of collects) {
      const d = c.date_collecte || c.created_at;
      const year = d ? new Date(d).getFullYear() : new Date(c.created_at).getFullYear();
      const anneeScolaire = d
        ? (new Date(d).getMonth() >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`)
        : 'inconnu';
      if (!byYear[anneeScolaire]) byYear[anneeScolaire] = { total: 0, ecoles: new Set(), enqueteurs: new Set() };
      byYear[anneeScolaire].total++;
      if (c.ecole_id) byYear[anneeScolaire].ecoles.add(c.ecole_id);
      if (c.enqueteur_id) byYear[anneeScolaire].enqueteurs.add(c.enqueteur_id);
    }
    const result = Object.entries(byYear).map(([annee, v]) => ({
      annee_scolaire: annee,
      collectes: v.total,
      ecoles_visitees: v.ecoles.size,
      enqueteurs_actifs: v.enqueteurs.size,
    })).sort((a, b) => b.annee_scolaire.localeCompare(a.annee_scolaire));
    res.json(result);
  } catch (err) { next(err); }
});

// Classement des communes (admin only)
router.get('/commune-ranking', requireRole('admin', 'ministre', 'president_region'), async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('ecoles')
      .select('commune_code, departement_code, region_code, nombre_filles, nombre_garcons, enseignants_presents, toilettes_filles_fonctionnelles, eau_potable, electricite, materiaux_precaires, inventaire_classes, collect_status');
    if (error) throw error;
    const schools = data || [];
    const byCommune = {};
    for (const s of schools) {
      const k = s.commune_code;
      if (!k) continue;
      if (!byCommune[k]) byCommune[k] = { commune: k, dept: s.departement_code, region: s.region_code, ecoles: 0, filles: 0, garcons: 0, enseignants: 0, sans_eau: 0, sans_toilettes: 0, materiaux: 0, bancs: 0, collected: 0 };
      const c = byCommune[k];
      c.ecoles++;
      c.filles += s.nombre_filles || 0;
      c.garcons += s.nombre_garcons || 0;
      c.enseignants += s.enseignants_presents || 0;
      if (!s.eau_potable) c.sans_eau++;
      if (!s.toilettes_filles_fonctionnelles) c.sans_toilettes++;
      if (s.materiaux_precaires?.length > 0) c.materiaux++;
      c.bancs += (s.inventaire_classes || []).reduce((ss, cl) => ss + (cl.besoin_bancs || 0), 0);
      if (s.collect_status === 'collected') c.collected++;
    }
    const ranking = Object.values(byCommune).map(c => ({
      ...c,
      eleves: c.filles + c.garcons,
      taux_collecte: c.ecoles > 0 ? Math.round(c.collected / c.ecoles * 100) : 0,
      taux_sans_eau: c.ecoles > 0 ? Math.round(c.sans_eau / c.ecoles * 100) : 0,
      taux_sans_toilettes: c.ecoles > 0 ? Math.round(c.sans_toilettes / c.ecoles * 100) : 0,
    })).sort((a, b) => b.taux_collecte - a.taux_collecte);
    res.json(ranking);
  } catch (err) { next(err); }
});

// Alertes critiques
router.get('/alerts', requireRole('admin', 'ministre', 'president_region'), async (req, res, next) => {
  try {
    const { zone_level, zone_code } = req.query;
    let query = supabaseAdmin.from('ecoles').select('id, nom_etablissement, code_mena, commune_code, departement_code, region_code, district_code, eau_potable, toilettes_filles_fonctionnelles, electricite, materiaux_precaires, inventaire_classes');
    if (zone_code && zone_level) {
      const colMap = { district: 'district_code', region: 'region_code', departement: 'departement_code', commune: 'commune_code' };
      if (colMap[zone_level]) query = query.eq(colMap[zone_level], zone_code);
    }
    const { data, error } = await query;
    if (error) throw error;
    const d = data || [];
    const alerts = d.filter(e => !e.eau_potable || !e.toilettes_filles_fonctionnelles || e.materiaux_precaires?.length > 0 || (e.inventaire_classes || []).reduce((s, c) => s + (c.besoin_bancs || 0), 0) > 0);
    res.json({
      total: alerts.length,
      schools: alerts.map(e => ({
        id: e.id, nom: e.nom_etablissement, code: e.code_mena,
        commune: e.commune_code, dept: e.departement_code, region: e.region_code, district: e.district_code,
        sans_eau: !e.eau_potable, sans_toilettes: !e.toilettes_filles_fonctionnelles,
        sans_electricite: !e.electricite, materiaux: e.materiaux_precaires?.length > 0,
        bancs_manquants: (e.inventaire_classes || []).reduce((s, c) => s + (c.besoin_bancs || 0), 0),
      })),
    });
  } catch (err) { next(err); }
});

export default router;
