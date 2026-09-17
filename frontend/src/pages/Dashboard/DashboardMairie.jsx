import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const ZONE_LEVEL_LABELS = {
  district: 'District',
  region: 'Région',
  departement: 'Département',
  commune: 'Commune',
};

const ROLE_LABELS = {
  mairie: 'Maire',
  president_region: 'Président de Région',
  ministre: 'Ministre',
  directeur_afrique: 'Directeur Afrique',
  institution: 'Institution',
  admin: 'Administrateur',
  enqueteur: 'Enquêteur',
  partenaire: 'Partenaire',
  chercheur: 'Chercheur',
};

const ANNEES_SCOLAIRES = ['2026-2027', '2025-2026', '2024-2025', '2023-2024'];

const GEO_MAP = {
  district: 'districts',
  region: 'regions',
  departement: 'depts',
  commune: 'sous_prefectures',
};

function Jauge({ value, max, color = '#E8611A' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

function Delta({ zone, national, higherBetter = true }) {
  if (zone == null || national == null || national === 0) {
    return <span className="text-xs font-bold text-gray-400">—</span>;
  }
  const diff = zone - national;
  if (diff === 0) return <span className="text-xs font-bold text-gray-400">=</span>;
  const isBetter = higherBetter ? diff > 0 : diff < 0;
  return (
    <span className={`text-xs font-bold ${isBetter ? 'text-[#00796B]' : 'text-[#ba1a1a]'}`}>
      {diff > 0 ? '▲' : '▼'}
    </span>
  );
}
export default function DashboardMairie() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [nationalStats, setNationalStats] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [collecteHistory, setCollecteHistory] = useState([]);
  const [communeRanking, setCommuneRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [zoneName, setZoneName] = useState('');
  const [anneeScolaire, setAnneeScolaire] = useState('2025-2026');
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [categoryTab, setCategoryTab] = useState('statut');
  const [rankingModal, setRankingModal] = useState(null);
  const [expandedAlert, setExpandedAlert] = useState(null);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('osn_dashboard_view') || 'overview');

  const toggleView = () => {
    const next = viewMode === 'overview' ? 'analytical' : 'overview';
    setViewMode(next);
    localStorage.setItem('osn_dashboard_view', next);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getMyZone()
      .then(async (zoneData) => {
        if (cancelled) return;
        setData(zoneData);
        const { level, code } = zoneData.zone || {};
        if (level && code) {
          const geoFile = GEO_MAP[level];
          if (geoFile) {
            try {
              const geo = await fetch(`/${geoFile}.geojson`).then((r) => r.json());
              const feat = geo.features?.find(
                (f) => f.properties.code === code || f.properties.name === code
              );
              if (feat && !cancelled) setZoneName(feat.properties.name);
            } catch {}
          }
          const [nat, al, hist, rank] = await Promise.all([
            api.getNationalStats().catch(() => null),
            api.getAlerts(level, code).catch(() => null),
            api.getCollecteHistory().catch(() => []),
            api.getCommuneRanking().catch(() => []),
          ]);
          if (!cancelled) {
            setNationalStats(nat);
            setAlerts(al);
            setCollecteHistory(hist || []);
            setCommuneRanking(rank || []);
          }
        }
        if (!cancelled) setLoading(false);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message || 'Erreur de chargement');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F4EFE6]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#E8611A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-500 animate-pulse">Chargement de votre tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F4EFE6] px-4">
        <div className="bg-[#FAF8F3] rounded-xl p-6 text-center max-w-sm shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <span className="material-symbols-outlined text-[#ba1a1a] text-5xl">error</span>
          <h2 className="text-lg font-bold text-[#0D1B2A] mt-3">Erreur</h2>
          <p className="text-xs text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!data?.stats) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F4EFE6] px-4">
        <div className="bg-[#FAF8F3] rounded-xl p-6 text-center max-w-sm shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <span className="material-symbols-outlined text-gray-400 text-5xl">location_off</span>
          <h2 className="text-lg font-bold text-[#0D1B2A] mt-3">Aucune zone assignée</h2>
          <p className="text-xs text-gray-500 mt-2">Contactez un administrateur pour vous assigner une zone géographique.</p>
        </div>
      </div>
    );
  }

  const { zone, user: userInfo, stats } = data;
  const tauxCollecte =
    stats.total_ecoles > 0 ? Math.round((stats.by_status.collected / stats.total_ecoles) * 100) : 0;
  const ratioElevesEnseignant =
    stats.total_enseignants > 0 ? Math.round(stats.total_eleves / stats.total_enseignants) : 0;
  const pctUrbain =
    stats.total_ecoles > 0 ? Math.round((stats.by_milieu.urbain / stats.total_ecoles) * 100) : 0;
  const pctPublic =
    stats.total_ecoles > 0 ? Math.round((stats.by_statut.public / stats.total_ecoles) * 100) : 0;

  const currentHistory = collecteHistory.find((h) => h.annee_scolaire === anneeScolaire) || collecteHistory[0];
  const prevIdx = collecteHistory.findIndex((h) => h.annee_scolaire === anneeScolaire) + 1;
  const prevHistory = collecteHistory[prevIdx] || collecteHistory[1] || null;

  const chartData = collecteHistory.map((h) => ({
    name: h.annee_scolaire,
    Collectes: h.collectes,
    'Écoles visitées': h.ecoles_visitees,
    Enquêteurs: h.enqueteurs_actifs,
  }));

  const alertList = alerts?.schools || [];
  const visibleAlerts = showAllAlerts ? alertList : alertList.slice(0, 3);

  const indicators = nationalStats
    ? [
        {
          label: 'Taux de filles',
          zoneVal: `${stats.taux_filles_pct}%`,
          natVal: `${nationalStats.taux_filles_pct}%`,
          zone: stats.taux_filles_pct,
          nat: nationalStats.taux_filles_pct,
          higherBetter: true,
        },
        {
          label: 'Ratio élèves/enseignant',
          zoneVal: `${ratioElevesEnseignant}:1`,
          natVal: `${nationalStats.ratio_eleves_enseignant}:1`,
          zone: ratioElevesEnseignant,
          nat: nationalStats.ratio_eleves_enseignant,
          higherBetter: false,
        },
        {
          label: 'Milieu urbain',
          zoneVal: `${pctUrbain}%`,
          natVal: `${nationalStats.pct_milieu_urbain}%`,
          zone: pctUrbain,
          nat: nationalStats.pct_milieu_urbain,
          higherBetter: null,
        },
        {
          label: 'Écoles publiques',
          zoneVal: `${pctPublic}%`,
          natVal: `${nationalStats.pct_public}%`,
          zone: pctPublic,
          nat: nationalStats.pct_public,
          higherBetter: null,
        },
      ]
    : [];

  const categoryItems =
    categoryTab === 'statut'
      ? [
          { label: 'Public', count: stats.by_statut.public, filter: 'statut=public', icon: 'account_balance' },
          { label: 'Privé laïc', count: stats.by_statut.prive_laic, filter: 'statut=prive_laic', icon: 'church' },
          { label: 'Privé confessionnel', count: stats.by_statut.prive_confessionnel, filter: 'statut=prive_confessionnel', icon: 'menu_book' },
        ]
      : categoryTab === 'niveau'
      ? [
          { label: 'Primaire', count: stats.by_niveau.primaire, filter: 'niveau=primaire', icon: 'child_care' },
          { label: 'Secondaire', count: stats.by_niveau.secondaire, filter: 'niveau=secondaire', icon: 'science' },
          { label: 'Maternelle', count: stats.by_niveau.maternelle, filter: 'niveau=maternelle', icon: 'palette' },
        ]
      : [
          { label: 'Urbain', count: stats.by_milieu.urbain, filter: 'milieu=urbain', icon: 'location_city' },
          { label: 'Rural', count: stats.by_milieu.rural, filter: 'milieu=rural', icon: 'landscape' },
        ];

  const besoins = [
    { label: 'Sans eau potable', value: stats.infrastructure.sans_eau, color: '#ba1a1a', filter: 'sans_eau', icon: 'water_drop' },
    { label: 'Sans toilettes', value: stats.infrastructure.sans_toilettes, color: '#E8611A', filter: 'sans_toilettes', icon: 'wc' },
    { label: 'Sans électricité', value: stats.infrastructure.sans_electricite, color: '#d97706', filter: 'sans_electricite', icon: 'bolt' },
    { label: 'Matériaux précaires', value: stats.infrastructure.materiaux_precaires, color: '#4B5563', filter: 'materiaux_precaires', icon: 'construction' },
    { label: 'Manque de bancs', value: stats.infrastructure.besoin_bancs, color: '#7C3AED', filter: 'manque_bancs', icon: 'table_chart', subtitle: `${stats.infrastructure.besoin_bancs_total || 0} bancs manquants` },
  ];

  const isAdmin = user?.role === 'admin' || user?.role === 'ministre';

  const generatePDF = () => {
    const w = window.open('', '_blank');
    const rows = [
      ['Écoles', stats.total_ecoles],
      ['Élèves', stats.total_eleves.toLocaleString('fr-FR')],
      ['Enseignants', stats.total_enseignants],
      ['Filles', `${stats.taux_filles_pct}%`],
      ['Taux collecte', `${tauxCollecte}%`],
      ['Ratio élèves/enseignant', `${ratioElevesEnseignant}:1`],
      ['Milieu urbain', `${pctUrbain}%`],
      ['Écoles publiques', `${pctPublic}%`],
    ];
    const infraRows = besoins.map(b => [b.label, b.value]);
    const alertRows = alertList.map(s => {
      const issues = [];
      if (s.sans_eau) issues.push('Sans eau');
      if (s.sans_toilettes) issues.push('Sans toilettes');
      if (s.materiaux) issues.push('Matériaux précaires');
      if (s.bancs_manquants > 0) issues.push(`${s.bancs_manquants} bancs`);
      return [s.nom || s.code, issues.join(', ')];
    });
    const commRows = isAdmin ? communeRanking.slice(0, 20).map((c, i) => [`${i+1}. ${c.commune}`, `${c.ecoles} écoles`, `${c.taux_collecte}% collecte`]) : [];
    const table = (title, headers, data) => `
      <h2 style="color:#0D1B2A;font-size:16px;margin:20px 0 8px;border-bottom:2px solid #E8611A;padding-bottom:4px">${title}</h2>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <tr>${headers.map(h => `<th style="text-align:left;padding:4px 8px;background:#F4EFE6;border:1px solid #CBD5E1">${h}</th>`).join('')}</tr>
        ${data.map((r, i) => `<tr style="background:${i%2===0?'#FAF8F3':'#fff'}">${r.map(c => `<td style="padding:4px 8px;border:1px solid #CBD5E1">${c}</td>`).join('')}</tr>`).join('')}
      </table>`;
    w.document.write(`<!DOCTYPE html><html><head><title>Rapport ${zoneName}</title>
      <style>body{font-family:Inter,system-ui,sans-serif;padding:32px;color:#0D1B2A;max-width:800px;margin:0 auto}
      @media print{body{padding:16px}}</style></head><body>
      <h1 style="color:#E8611A;margin:0">Rapport Observatoire Scolaire National</h1>
      <p style="color:#6B7280;margin:4px 0 0">${ZONE_LEVEL_LABELS[zone?.level]} ${zoneName || zone?.code} — Année ${anneeScolaire}</p>
      <p style="color:#6B7280;margin:2px 0 16px">Responsable: ${userInfo?.prenom} ${userInfo?.nom} (${ROLE_LABELS[userInfo?.role]})</p>
      ${table('Indicateurs clés', ['Indicateur', 'Valeur'], rows)}
      ${table('Infrastructure', ['Problème', 'Nombre'], infraRows)}
      ${alertRows.length > 0 ? table(`Alertes critiques (${alerts.total})`, ['École', 'Problèmes'], alertRows) : ''}
      ${commRows.length > 0 ? table('Classement des communes', ['Commune', 'Détails', 'Collecte'], commRows) : ''}
      <script>window.onload=()=>{window.print();window.close()}</script>
      </body></html>`);
    w.document.close();
  };
  return (
    <div className="h-full overflow-auto bg-[#F4EFE6]">
      <div className="max-w-lg md:max-w-3xl xl:max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5">

        {/* Header */}
        <div className="bg-[#FAF8F3] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#E8611A] text-[18px]">location_city</span>
              <span className="text-xs font-bold text-[#E8611A] uppercase tracking-wider">
                {ROLE_LABELS[userInfo?.role] || userInfo?.role} &middot; {ZONE_LEVEL_LABELS[zone?.level]} {zoneName || zone?.code}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={anneeScolaire}
                onChange={(e) => setAnneeScolaire(e.target.value)}
                className="text-[10px] font-bold text-[#0D1B2A] bg-[#F4EFE6] border border-gray-200 rounded-lg px-2 py-1 cursor-pointer outline-none"
              >
                {ANNEES_SCOLAIRES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <div className="flex bg-[#F4EFE6] rounded-lg p-0.5 border border-gray-200">
                <button onClick={() => viewMode !== 'overview' && toggleView()}
                  className={`text-[9px] font-bold px-2 py-1 rounded-md transition-all cursor-pointer ${viewMode === 'overview' ? 'bg-[#E8611A] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                  Vue d'ensemble
                </button>
                <button onClick={() => viewMode !== 'analytical' && toggleView()}
                  className={`text-[9px] font-bold px-2 py-1 rounded-md transition-all cursor-pointer ${viewMode === 'analytical' ? 'bg-[#E8611A] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                  Analytique
                </button>
              </div>
            </div>
          </div>
          <h2 className="text-lg font-bold text-[#0D1B2A]">
            {userInfo?.organisation || `${userInfo?.prenom} ${userInfo?.nom}`}
          </h2>
          {userInfo?.organisation && (
            <p className="text-xs text-gray-500 mt-1">{userInfo?.prenom} {userInfo?.nom}</p>
          )}
        </div>

        {/* ====== VUE D'ENSEMBLE ====== */}
        {viewMode === 'overview' && (
          <>
            {/* 5 compact KPI cards */}
            <div className="grid grid-cols-5 gap-2">
              <button
                onClick={() => api.getSchoolRanking(zone.level, zone.code, 'ecoles').then(d => setRankingModal({ ...d, filterType: 'ecoles' })).catch(() => {})}
                className="p-2 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] text-left w-full transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] cursor-pointer bg-[#FAF8F3]"
              >
                <span className="material-symbols-outlined text-[#0D1B2A] text-[16px]">school</span>
                <p className="text-[9px] text-gray-500 mt-1">Écoles</p>
                <p className="text-sm font-black tabular-nums text-[#0D1B2A]">{stats.total_ecoles}</p>
              </button>
              <button
                onClick={() => api.getSchoolRanking(zone.level, zone.code, 'eleves').then(d => setRankingModal({ ...d, filterType: 'eleves' })).catch(() => {})}
                className="p-2 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] text-left w-full transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] cursor-pointer bg-[#FAF8F3]"
              >
                <span className="material-symbols-outlined text-[#E8611A] text-[16px]">groups</span>
                <p className="text-[9px] text-gray-500 mt-1">Élèves</p>
                <p className="text-sm font-black tabular-nums text-[#0D1B2A]">{stats.total_eleves.toLocaleString('fr-FR')}</p>
              </button>
              <button
                onClick={() => api.getSchoolRanking(zone.level, zone.code, 'enseignants').then(d => setRankingModal({ ...d, filterType: 'enseignants' })).catch(() => {})}
                className="p-2 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] text-left w-full transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] cursor-pointer bg-[#FAF8F3]"
              >
                <span className="material-symbols-outlined text-[#00796B] text-[16px]">person</span>
                <p className="text-[9px] text-gray-500 mt-1">Enseignants</p>
                <p className="text-sm font-black tabular-nums text-[#0D1B2A]">{stats.total_enseignants.toLocaleString('fr-FR')}</p>
              </button>
              <button
                onClick={() => api.getSchoolRanking(zone.level, zone.code, 'cloturees').then(d => setRankingModal({ ...d, filterType: 'cloturees' })).catch(() => {})}
                className="p-2 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] text-left w-full transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] cursor-pointer bg-[#FAF8F3]"
              >
                <span className="material-symbols-outlined text-[#00796B] text-[16px]">fence</span>
                <p className="text-[9px] text-gray-500 mt-1">Clôturées</p>
                <p className="text-sm font-black tabular-nums text-[#0D1B2A]">{stats.infrastructure.ecoles_cloturees}</p>
              </button>
              <button
                onClick={() => api.getSchoolRanking(zone.level, zone.code, 'sans_eau').then(d => setRankingModal({ ...d, filterType: 'sans_eau' })).catch(() => {})}
                className={`p-2 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] text-left w-full transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] cursor-pointer ${stats.infrastructure.sans_eau > 0 ? 'bg-[#ffdad6]/40' : 'bg-[#FAF8F3]'}`}
              >
                <span className={`material-symbols-outlined text-[16px] ${stats.infrastructure.sans_eau > 0 ? 'text-[#ba1a1a]' : 'text-[#0D1B2A]'}`}>water_drop</span>
                <p className="text-[9px] text-gray-500 mt-1">Sans eau</p>
                <p className={`text-sm font-black tabular-nums ${stats.infrastructure.sans_eau > 0 ? 'text-[#ba1a1a]' : 'text-[#0D1B2A]'}`}>{stats.infrastructure.sans_eau}</p>
              </button>
            </div>

            {/* Alertes critiques — compact, top 3 */}
            {alertList.length > 0 && (
              <div className="bg-[#ffdad6] rounded-xl p-3 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#ba1a1a] text-[16px]">warning</span>
                    <h3 className="text-xs font-bold text-[#ba1a1a]">Alertes critiques ({alerts.total})</h3>
                  </div>
                  <button
                    onClick={() => navigate(`/explorer/${zone.level}/${zone.code}?filter=critical&show_points=1`)}
                    className="text-[9px] font-bold text-white bg-[#ba1a1a] rounded-lg px-2.5 py-1 hover:bg-[#ba1a1a]/90 transition-colors cursor-pointer"
                  >
                    Explorer
                  </button>
                </div>
                <div className="space-y-1.5">
                  {visibleAlerts.slice(0, 3).map((s) => (
                    <div key={s.id || s.code}
                      className="bg-white/60 rounded-lg overflow-hidden cursor-pointer"
                      onClick={() => setExpandedAlert(expandedAlert === (s.id || s.code) ? null : (s.id || s.code))}>
                      <div className="flex items-center gap-2 p-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-[#0D1B2A] truncate">{s.nom || s.code}</p>
                        </div>
                        <div className="flex gap-0.5 flex-shrink-0">
                          {s.sans_eau && (
                            <span title="Sans eau potable" className="w-4 h-4 rounded-full bg-[#ba1a1a]/10 flex items-center justify-center">
                              <span className="material-symbols-outlined text-[9px] text-[#ba1a1a]">water_drop</span>
                            </span>
                          )}
                          {s.sans_toilettes && (
                            <span title="Sans toilettes" className="w-4 h-4 rounded-full bg-[#ba1a1a]/10 flex items-center justify-center">
                              <span className="material-symbols-outlined text-[9px] text-[#ba1a1a]">wc</span>
                            </span>
                          )}
                          {s.materiaux && (
                            <span title="Matériaux précaires" className="w-4 h-4 rounded-full bg-[#ba1a1a]/10 flex items-center justify-center">
                              <span className="material-symbols-outlined text-[9px] text-[#ba1a1a]">construction</span>
                            </span>
                          )}
                          {s.bancs_manquants > 0 && (
                            <span title={`${s.bancs_manquants} bancs manquants`} className="w-4 h-4 rounded-full bg-[#ba1a1a]/10 flex items-center justify-center">
                              <span className="material-symbols-outlined text-[9px] text-[#ba1a1a]">chair</span>
                            </span>
                          )}
                        </div>
                        <span className="material-symbols-outlined text-[10px] text-gray-300">
                          {expandedAlert === (s.id || s.code) ? 'expand_less' : 'expand_more'}
                        </span>
                      </div>
                      {expandedAlert === (s.id || s.code) && (
                        <div className="px-2 pb-2 pt-0 space-y-1 border-t border-[#ba1a1a]/10">
                          {s.sans_eau && <p className="text-[9px] text-[#ba1a1a] font-medium flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">water_drop</span> Sans eau potable</p>}
                          {s.sans_toilettes && <p className="text-[9px] text-[#ba1a1a] font-medium flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">wc</span> Sans toilettes</p>}
                          {s.materiaux && <p className="text-[9px] text-[#ba1a1a] font-medium flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">construction</span> Matériaux précaires</p>}
                          {s.bancs_manquants > 0 && <p className="text-[9px] text-[#ba1a1a] font-medium flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">chair</span> {s.bancs_manquants} bancs manquants</p>}
                          {s.commune && <p className="text-[9px] text-gray-400 mt-1">{s.commune}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comparaison vs national */}
            {indicators.length > 0 && (
              <div className="bg-[#FAF8F3] rounded-xl p-3 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
                <h3 className="text-xs font-bold text-[#0D1B2A] mb-2">Comparaison vs national</h3>
                <div className="grid grid-cols-2 gap-3">
                  {indicators.map((ind) => (
                    <div key={ind.label} className="bg-[#F4EFE6] rounded-lg p-2.5">
                      <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">{ind.label}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-black text-[#0D1B2A]">{ind.zoneVal}</span>
                        {ind.higherBetter !== null ? (
                          <Delta zone={ind.zone} national={ind.nat} higherBetter={ind.higherBetter} />
                        ) : (
                          <span className="text-xs font-bold text-gray-400">=</span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">vs {ind.natVal} national</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Parité */}
            <div className="bg-[#FAF8F3] rounded-xl p-3 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              <h3 className="text-[10px] font-bold text-[#0D1B2A] mb-2">Parité filles/garçons</h3>
              <div className="flex justify-between text-[9px] mb-1">
                <span className="font-bold text-[#E8611A]">Filles {stats.taux_filles_pct}%</span>
                <span className="font-bold text-[#0D1B2A]">{100 - stats.taux_filles_pct}% Garçons</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-[#E8611A] rounded-l-full" style={{ width: `${stats.taux_filles_pct}%` }} />
                <div className="h-full bg-[#0D1B2A] rounded-r-full" style={{ width: `${100 - stats.taux_filles_pct}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="text-center bg-[#F4EFE6] rounded-lg p-1.5">
                  <p className="text-sm font-black text-[#E8611A]">{stats.total_filles.toLocaleString('fr-FR')}</p>
                  <p className="text-[8px] font-bold text-gray-500 uppercase">Filles</p>
                </div>
                <div className="text-center bg-[#F4EFE6] rounded-lg p-1.5">
                  <p className="text-sm font-black text-[#0D1B2A]">{stats.total_garcons.toLocaleString('fr-FR')}</p>
                  <p className="text-[8px] font-bold text-gray-500 uppercase">Garçons</p>
                </div>
              </div>
            </div>

            {/* Top 5 écoles à besoins */}
            {stats.top_ecoles_besoin?.length > 0 && (
              <div className="bg-[#FAF8F3] rounded-xl p-3 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
                <h3 className="text-xs font-bold text-[#0D1B2A] mb-2">Top écoles à besoins</h3>
                <div className="space-y-1.5">
                  {stats.top_ecoles_besoin.slice(0, 5).map((e, i) => (
                    <div key={e.id} className="flex items-center gap-2 bg-[#F4EFE6] rounded-lg p-2">
                      <span className="text-sm font-black text-[#E8611A] w-5 text-center">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-[#0D1B2A] truncate">{e.nom}</p>
                        <p className="text-[9px] text-gray-500">{e.eleves} élèves · {e.besoins} besoins</p>
                      </div>
                      <div className="flex gap-0.5">
                        {e.sans_eau && (
                          <span className="w-4 h-4 rounded-full bg-[#ba1a1a]/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[9px] text-[#ba1a1a]">water_drop</span>
                          </span>
                        )}
                        {e.sans_toilettes && (
                          <span className="w-4 h-4 rounded-full bg-[#E8611A]/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[9px] text-[#E8611A]">wc</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2.5 pb-4">
              <button
                onClick={() => navigate(`/explorer/${zone.level}/${zone.code}?show_points=1`)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#E8611A] text-white text-sm font-bold shadow-[0_4px_24px_rgba(232,97,26,0.3)] hover:bg-[#d4550f] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">map</span> Explorer la carte
              </button>
              <button
                onClick={generatePDF}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#FAF8F3] text-[#0D1B2A] text-sm font-bold shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:bg-gray-100 active:scale-[0.98] transition-all cursor-pointer border border-gray-200"
              >
                <span className="material-symbols-outlined text-[20px]">description</span> Générer un rapport PDF
              </button>
            </div>
          </>
        )}

        {/* ====== VUE ANALYTIQUE ====== */}
        {viewMode === 'analytical' && (
          <>
            {/* 5 compact KPI cards — same layout as Vue d'ensemble */}
            <div className="grid grid-cols-5 gap-2">
              <button
                onClick={() => api.getSchoolRanking(zone.level, zone.code, 'ecoles').then(d => setRankingModal({ ...d, filterType: 'ecoles' })).catch(() => {})}
                className="p-2 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] text-left w-full transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] cursor-pointer bg-[#FAF8F3]"
              >
                <span className="material-symbols-outlined text-[#0D1B2A] text-[16px]">school</span>
                <p className="text-[9px] text-gray-500 mt-1">Écoles</p>
                <p className="text-sm font-black tabular-nums text-[#0D1B2A]">{stats.total_ecoles}</p>
              </button>
              <button
                onClick={() => api.getSchoolRanking(zone.level, zone.code, 'eleves').then(d => setRankingModal({ ...d, filterType: 'eleves' })).catch(() => {})}
                className="p-2 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] text-left w-full transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] cursor-pointer bg-[#FAF8F3]"
              >
                <span className="material-symbols-outlined text-[#E8611A] text-[16px]">groups</span>
                <p className="text-[9px] text-gray-500 mt-1">Élèves</p>
                <p className="text-sm font-black tabular-nums text-[#0D1B2A]">{stats.total_eleves.toLocaleString('fr-FR')}</p>
              </button>
              <button
                onClick={() => api.getSchoolRanking(zone.level, zone.code, 'enseignants').then(d => setRankingModal({ ...d, filterType: 'enseignants' })).catch(() => {})}
                className="p-2 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] text-left w-full transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] cursor-pointer bg-[#FAF8F3]"
              >
                <span className="material-symbols-outlined text-[#00796B] text-[16px]">person</span>
                <p className="text-[9px] text-gray-500 mt-1">Enseignants</p>
                <p className="text-sm font-black tabular-nums text-[#0D1B2A]">{stats.total_enseignants.toLocaleString('fr-FR')}</p>
              </button>
              <button
                onClick={() => api.getSchoolRanking(zone.level, zone.code, 'cloturees').then(d => setRankingModal({ ...d, filterType: 'cloturees' })).catch(() => {})}
                className="p-2 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] text-left w-full transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] cursor-pointer bg-[#FAF8F3]"
              >
                <span className="material-symbols-outlined text-[#00796B] text-[16px]">fence</span>
                <p className="text-[9px] text-gray-500 mt-1">Clôturées</p>
                <p className="text-sm font-black tabular-nums text-[#0D1B2A]">{stats.infrastructure.ecoles_cloturees}</p>
              </button>
              <button
                onClick={() => api.getSchoolRanking(zone.level, zone.code, 'sans_eau').then(d => setRankingModal({ ...d, filterType: 'sans_eau' })).catch(() => {})}
                className={`p-2 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] text-left w-full transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] cursor-pointer ${stats.infrastructure.sans_eau > 0 ? 'bg-[#ffdad6]/40' : 'bg-[#FAF8F3]'}`}
              >
                <span className={`material-symbols-outlined text-[16px] ${stats.infrastructure.sans_eau > 0 ? 'text-[#ba1a1a]' : 'text-[#0D1B2A]'}`}>water_drop</span>
                <p className="text-[9px] text-gray-500 mt-1">Sans eau</p>
                <p className={`text-sm font-black tabular-nums ${stats.infrastructure.sans_eau > 0 ? 'text-[#ba1a1a]' : 'text-[#0D1B2A]'}`}>{stats.infrastructure.sans_eau}</p>
              </button>
            </div>

            {/* Alertes critiques — compact with expand/collapse, matching Vue d'ensemble */}
            {alertList.length > 0 && (
              <div className="bg-[#ffdad6] rounded-xl p-3 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#ba1a1a] text-[16px]">warning</span>
                    <h3 className="text-xs font-bold text-[#ba1a1a]">Alertes critiques ({alerts.total})</h3>
                  </div>
                  <button
                    onClick={() => navigate(`/explorer/${zone.level}/${zone.code}?filter=critical&show_points=1`)}
                    className="text-[9px] font-bold text-white bg-[#ba1a1a] rounded-lg px-2.5 py-1 hover:bg-[#ba1a1a]/90 transition-colors cursor-pointer"
                  >
                    Explorer
                  </button>
                </div>
                <div className="space-y-1.5">
                  {visibleAlerts.slice(0, 3).map((s) => (
                    <div key={s.id || s.code}
                      className="bg-white/60 rounded-lg overflow-hidden cursor-pointer"
                      onClick={() => setExpandedAlert(expandedAlert === (s.id || s.code) ? null : (s.id || s.code))}>
                      <div className="flex items-center gap-2 p-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-[#0D1B2A] truncate">{s.nom || s.code}</p>
                        </div>
                        <div className="flex gap-0.5 flex-shrink-0">
                          {s.sans_eau && (
                            <span title="Sans eau potable" className="w-4 h-4 rounded-full bg-[#ba1a1a]/10 flex items-center justify-center">
                              <span className="material-symbols-outlined text-[9px] text-[#ba1a1a]">water_drop</span>
                            </span>
                          )}
                          {s.sans_toilettes && (
                            <span title="Sans toilettes" className="w-4 h-4 rounded-full bg-[#ba1a1a]/10 flex items-center justify-center">
                              <span className="material-symbols-outlined text-[9px] text-[#ba1a1a]">wc</span>
                            </span>
                          )}
                          {s.materiaux && (
                            <span title="Matériaux précaires" className="w-4 h-4 rounded-full bg-[#ba1a1a]/10 flex items-center justify-center">
                              <span className="material-symbols-outlined text-[9px] text-[#ba1a1a]">construction</span>
                            </span>
                          )}
                          {s.bancs_manquants > 0 && (
                            <span title={`${s.bancs_manquants} bancs manquants`} className="w-4 h-4 rounded-full bg-[#ba1a1a]/10 flex items-center justify-center">
                              <span className="material-symbols-outlined text-[9px] text-[#ba1a1a]">chair</span>
                            </span>
                          )}
                        </div>
                        <span className="material-symbols-outlined text-[10px] text-gray-300">
                          {expandedAlert === (s.id || s.code) ? 'expand_less' : 'expand_more'}
                        </span>
                      </div>
                      {expandedAlert === (s.id || s.code) && (
                        <div className="px-2 pb-2 pt-0 space-y-1 border-t border-[#ba1a1a]/10">
                          {s.sans_eau && <p className="text-[9px] text-[#ba1a1a] font-medium flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">water_drop</span> Sans eau potable</p>}
                          {s.sans_toilettes && <p className="text-[9px] text-[#ba1a1a] font-medium flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">wc</span> Sans toilettes</p>}
                          {s.materiaux && <p className="text-[9px] text-[#ba1a1a] font-medium flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">construction</span> Matériaux précaires</p>}
                          {s.bancs_manquants > 0 && <p className="text-[9px] text-[#ba1a1a] font-medium flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">chair</span> {s.bancs_manquants} bancs manquants</p>}
                          {s.commune && <p className="text-[9px] text-gray-400 mt-1">{s.commune}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comparaison vs national */}
            {indicators.length > 0 && (
              <div className="bg-[#FAF8F3] rounded-xl p-3 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
                <h3 className="text-xs font-bold text-[#0D1B2A] mb-2">Comparaison vs national</h3>
                <div className="grid grid-cols-2 gap-3">
                  {indicators.map((ind) => (
                    <div key={ind.label} className="bg-[#F4EFE6] rounded-lg p-2.5">
                      <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">{ind.label}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-black text-[#0D1B2A]">{ind.zoneVal}</span>
                        {ind.higherBetter !== null ? (
                          <Delta zone={ind.zone} national={ind.nat} higherBetter={ind.higherBetter} />
                        ) : (
                          <span className="text-xs font-bold text-gray-400">=</span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">vs {ind.natVal} national</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Écoles par catégorie */}
            <div className="bg-[#FAF8F3] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              <h3 className="text-sm font-bold text-[#0D1B2A] mb-3">Écoles par catégorie</h3>
              <div className="flex gap-1 mb-3 bg-[#F4EFE6] rounded-lg p-0.5">
                {[
                  { key: 'statut', label: 'Statut' },
                  { key: 'niveau', label: 'Niveau' },
                  { key: 'milieu', label: 'Milieu' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setCategoryTab(tab.key)}
                    className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-colors cursor-pointer ${
                      categoryTab === tab.key
                        ? 'bg-white text-[#0D1B2A] shadow-sm'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                {categoryItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => navigate(`/explorer/${zone.level}/${zone.code}?${item.filter}&show_points=1`)}
                    className="w-full flex items-center gap-2.5 bg-[#F4EFE6] rounded-lg p-2.5 text-left transition-colors hover:bg-[#E8611A]/5 cursor-pointer group"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#E8611A]">{item.icon}</span>
                    <span className="flex-1 text-xs font-semibold text-[#0D1B2A]">{item.label}</span>
                    <span className="text-sm font-black text-[#0D1B2A]">{item.count}</span>
                    <span className="material-symbols-outlined text-[12px] text-gray-300 group-hover:text-[#E8611A] transition-colors">
                      arrow_forward
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Statut collecte */}
            <div className="bg-[#FAF8F3] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              <h3 className="text-sm font-bold text-[#0D1B2A] mb-3">Statut de collecte</h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Collectées', count: stats.by_status.collected, color: '#00796B', filter: 'collected' },
                  { label: 'En attente', count: stats.by_status.waiting, color: '#E8611A', filter: 'waiting' },
                  { label: 'Non programmées', count: stats.by_status.pending, color: '#94A3B8', filter: 'pending' },
                ].map((s) => (
                  <button
                    key={s.label}
                    onClick={() => navigate(`/explorer/${zone.level}/${zone.code}?status=${s.filter}&show_points=1`)}
                    className="w-full text-left hover:bg-[#F4EFE6] rounded-lg p-1.5 -m-1.5 transition-colors cursor-pointer"
                  >
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-gray-700">{s.label}</span>
                      <span className="font-bold" style={{ color: s.color }}>
                        {s.count} / {stats.total_ecoles}
                      </span>
                    </div>
                    <Jauge value={s.count} max={stats.total_ecoles} color={s.color} />
                  </button>
                ))}
              </div>
            </div>

            {/* Parité */}
            <div className="bg-[#FAF8F3] rounded-xl p-3 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              <h3 className="text-[10px] font-bold text-[#0D1B2A] mb-2">Parité filles/garçons</h3>
              <div className="flex justify-between text-[9px] mb-1">
                <span className="font-bold text-[#E8611A]">Filles {stats.taux_filles_pct}%</span>
                <span className="font-bold text-[#0D1B2A]">{100 - stats.taux_filles_pct}% Garçons</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-[#E8611A] rounded-l-full" style={{ width: `${stats.taux_filles_pct}%` }} />
                <div className="h-full bg-[#0D1B2A] rounded-r-full" style={{ width: `${100 - stats.taux_filles_pct}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="text-center bg-[#F4EFE6] rounded-lg p-1.5">
                  <p className="text-sm font-black text-[#E8611A]">{stats.total_filles.toLocaleString('fr-FR')}</p>
                  <p className="text-[8px] font-bold text-gray-500 uppercase">Filles</p>
                </div>
                <div className="text-center bg-[#F4EFE6] rounded-lg p-1.5">
                  <p className="text-sm font-black text-[#0D1B2A]">{stats.total_garcons.toLocaleString('fr-FR')}</p>
                  <p className="text-[8px] font-bold text-gray-500 uppercase">Garçons</p>
                </div>
              </div>
            </div>

            {/* Infrastructure */}
            <div className="bg-[#FAF8F3] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              <h3 className="text-sm font-bold text-[#0D1B2A] mb-3">Infrastructure</h3>
              <div className="space-y-2.5">
                {besoins.map((b) => (
                  <button
                    key={b.label}
                    onClick={() => api.getSchoolRanking(zone.level, zone.code, b.filter).then(d => setRankingModal({ ...d, filterType: b.filter })).catch(() => {})}
                    className="w-full text-left hover:bg-[#F4EFE6] rounded-lg p-2 -m-2 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px] text-gray-400 group-hover:text-[#E8611A] transition-colors">
                          {b.icon}
                        </span>
                        <div>
                          <span className="text-xs font-semibold text-gray-700">{b.label}</span>
                          {b.subtitle && (
                            <p className="text-[10px] text-gray-400">{b.subtitle}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs" style={{ color: b.color }}>{b.value}</span>
                        <span className="material-symbols-outlined text-[12px] text-gray-300 group-hover:text-[#E8611A] transition-colors">
                          arrow_forward
                        </span>
                      </div>
                    </div>
                    <Jauge value={b.value} max={stats.total_ecoles} color={b.color} />
                  </button>
                ))}
              </div>
            </div>

            {/* Historique collectes */}
            {chartData.length > 0 && (
              <div className="bg-[#FAF8F3] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
                <h3 className="text-sm font-bold text-[#0D1B2A] mb-3">Historique des collectes</h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94A3B8" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#94A3B8" />
                      <Tooltip
                        contentStyle={{
                          fontSize: 11,
                          borderRadius: 8,
                          border: 'none',
                          boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="Collectes" fill="#E8611A" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Écoles visitées" fill="#00796B" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Enquêteurs" fill="#475569" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {currentHistory && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="text-center bg-[#F4EFE6] rounded-lg p-2">
                      <p className="text-sm font-black text-[#E8611A]">{currentHistory.collectes}</p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase">Collectes</p>
                    </div>
                    <div className="text-center bg-[#F4EFE6] rounded-lg p-2">
                      <p className="text-sm font-black text-[#00796B]">{currentHistory.ecoles_visitees}</p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase">Visitées</p>
                    </div>
                    <div className="text-center bg-[#F4EFE6] rounded-lg p-2">
                      <p className="text-sm font-black text-[#475569]">{currentHistory.enqueteurs_actifs}</p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase">Enquêteurs</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Répartition par milieu */}
            <div className="bg-[#FAF8F3] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              <h3 className="text-sm font-bold text-[#0D1B2A] mb-3">Répartition par milieu</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate(`/explorer/${zone.level}/${zone.code}?milieu=urbain&show_points=1`)}
                  className="text-center bg-[#F4EFE6] rounded-lg p-3 transition-colors hover:bg-[#E8611A]/5 cursor-pointer group"
                >
                  <span className="material-symbols-outlined text-[#E8611A] text-[22px]">location_city</span>
                  <p className="text-lg font-black text-[#0D1B2A] mt-1">{stats.by_milieu.urbain}</p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Urbain</p>
                  <span className="material-symbols-outlined text-[12px] text-gray-300 group-hover:text-[#E8611A] transition-colors">
                    arrow_forward
                  </span>
                </button>
                <button
                  onClick={() => navigate(`/explorer/${zone.level}/${zone.code}?milieu=rural&show_points=1`)}
                  className="text-center bg-[#F4EFE6] rounded-lg p-3 transition-colors hover:bg-[#00796B]/5 cursor-pointer group"
                >
                  <span className="material-symbols-outlined text-[#00796B] text-[22px]">landscape</span>
                  <p className="text-lg font-black text-[#0D1B2A] mt-1">{stats.by_milieu.rural}</p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Rural</p>
                  <span className="material-symbols-outlined text-[12px] text-gray-300 group-hover:text-[#00796B] transition-colors">
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>

            {/* Top écoles à besoins */}
            {stats.top_ecoles_besoin?.length > 0 && (
              <div className="bg-[#FAF8F3] rounded-xl p-3 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
                <h3 className="text-xs font-bold text-[#0D1B2A] mb-2">Top écoles à besoins</h3>
                <div className="space-y-1.5">
                  {stats.top_ecoles_besoin.slice(0, 5).map((e, i) => (
                    <div key={e.id} className="flex items-center gap-2 bg-[#F4EFE6] rounded-lg p-2">
                      <span className="text-sm font-black text-[#E8611A] w-5 text-center">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-[#0D1B2A] truncate">{e.nom}</p>
                        <p className="text-[9px] text-gray-500">{e.eleves} élèves · {e.besoins} besoins</p>
                      </div>
                      <div className="flex gap-0.5">
                        {e.sans_eau && (
                          <span className="w-4 h-4 rounded-full bg-[#ba1a1a]/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[9px] text-[#ba1a1a]">water_drop</span>
                          </span>
                        )}
                        {e.sans_toilettes && (
                          <span className="w-4 h-4 rounded-full bg-[#E8611A]/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[9px] text-[#E8611A]">wc</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Classement communes (admin only) */}
            {isAdmin && communeRanking.length > 0 && (
              <div className="bg-[#FAF8F3] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
                <h3 className="text-sm font-bold text-[#0D1B2A] mb-3">Classement des communes</h3>
                <div className="space-y-1">
                  {[...communeRanking]
                    .sort((a, b) => b.taux_collecte - a.taux_collecte)
                    .slice(0, 10)
                    .map((c, i) => (
                      <div
                        key={c.commune}
                        className={`flex items-center gap-2 p-2 rounded-lg ${i % 2 === 0 ? 'bg-[#F4EFE6]' : 'bg-transparent'}`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                            i < 3 ? 'bg-[#E8611A] text-white' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#0D1B2A] truncate">{c.commune}</p>
                          <p className="text-[10px] text-gray-400">
                            {c.ecoles} écoles · {c.eleves?.toLocaleString('fr-FR') || 0} élèves
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-black text-[#0D1B2A]">{c.taux_collecte}%</p>
                          <p className="text-[10px] text-gray-400">collecte</p>
                        </div>
                        {(c.taux_sans_eau > 0 || c.taux_sans_toilettes > 0) && (
                          <div className="flex gap-1 flex-shrink-0">
                            {c.taux_sans_eau > 0 && (
                              <span className="w-4 h-4 rounded-full bg-[#ba1a1a]/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[9px] text-[#ba1a1a]">water_drop</span>
                              </span>
                            )}
                            {c.taux_sans_toilettes > 0 && (
                              <span className="w-4 h-4 rounded-full bg-[#ba1a1a]/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[9px] text-[#ba1a1a]">wc</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2.5 pb-4">
              <button
                onClick={() => navigate(`/explorer/${zone.level}/${zone.code}?show_points=1`)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#E8611A] text-white text-sm font-bold shadow-[0_4px_24px_rgba(232,97,26,0.3)] hover:bg-[#d4550f] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">map</span> Explorer la carte
              </button>
              <button
                onClick={generatePDF}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#FAF8F3] text-[#0D1B2A] text-sm font-bold shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:bg-gray-100 active:scale-[0.98] transition-all cursor-pointer border border-gray-200"
              >
                <span className="material-symbols-outlined text-[20px]">description</span> Générer un rapport PDF
              </button>
            </div>
          </>
        )}

      </div>

      {/* Modal ranking écoles */}
      {rankingModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setRankingModal(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-[#0D1B2A]">{rankingModal.title}</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">{rankingModal.total} écoles</p>
              </div>
              <button onClick={() => setRankingModal(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px] text-gray-400">close</span>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-3">
              {rankingModal.schools.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">Aucune école concernée</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {rankingModal.schools.map((e, i) => {
                    const val = e[rankingModal.sortKey];
                    const isEleves = rankingModal.filterType === 'eleves';
                    const isEcoles = rankingModal.filterType === 'ecoles';
                    return (
                      <div key={e.id} className="flex items-center gap-3 bg-[#F4EFE6] rounded-xl p-3">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 ${i < 3 ? 'bg-[#E8611A] text-white' : 'bg-gray-200 text-gray-600'}`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold text-[#0D1B2A] truncate">{e.nom}</p>
                          {isEleves ? (
                            <p className="text-[10px] text-gray-400">
                              <span className="text-[#E8611A] font-bold">{e.filles}</span> filles ({e.pct_filles}%) · <span className="text-[#0D1B2A] font-bold">{e.garcons}</span> garçons ({e.pct_garcons}%)
                            </p>
                          ) : isEcoles ? (
                            <p className="text-[10px] text-gray-400">
                              {e.nb_classes} classes · {e.nb_niveaux} niveaux · {e.eleves} élèves
                            </p>
                          ) : (
                            <p className="text-[10px] text-gray-400">
                              {e.niveau} · {e.milieu} · {e.eleves} élèves
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {isEleves ? (
                            <>
                              <p className="text-sm font-black text-[#7C3AED]">{e.eleves.toLocaleString('fr-FR')}</p>
                              <p className="text-[9px] text-gray-400">élèves</p>
                            </>
                          ) : isEcoles ? (
                            <>
                              <p className="text-sm font-black text-[#7C3AED]">{e.nb_classes}</p>
                              <p className="text-[9px] text-gray-400">classes</p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-black text-[#7C3AED]">
                                {typeof val === 'number' ? val.toLocaleString('fr-FR') : val}
                              </p>
                              <p className="text-[9px] text-gray-400">{rankingModal.title.toLowerCase()}</p>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {rankingModal.schools.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100">
                <button
                  onClick={() => {
                    const f = rankingModal.filterType;
                    const params = new URLSearchParams({ show_points: '1' });
                    if (['sans_eau', 'sans_toilettes', 'sans_electricite', 'materiaux_precaires', 'manque_bancs'].includes(f)) {
                      params.set('filter', f);
                    }
                    navigate(`/explorer/${zone.level}/${zone.code}?${params.toString()}`);
                    setRankingModal(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#E8611A] text-white text-xs font-bold shadow-[0_4px_24px_rgba(232,97,26,0.3)] hover:bg-[#d4550f] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">map</span> Voir sur la carte
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
