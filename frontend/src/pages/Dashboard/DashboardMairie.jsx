import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';

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

function Jauge({ value, max, color = '#E8611A' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full h-2 bg-[#dee8ff] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function KPICard({ icon, label, value, badge, badgeBg, error, loading, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`p-3.5 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] text-left w-full transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] cursor-pointer ${error ? 'bg-[#ffdad6]/40' : 'bg-[#FAF8F3]'}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`p-1.5 rounded-lg ${error ? 'bg-[#ffdad6] text-[#ba1a1a]' : 'bg-[#e7eeff] text-[#0D1B2A]'}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </span>
        {badge && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${badgeBg}15`, color: badgeBg }}>{badge}</span>}
      </div>
      <p className="text-xs text-[#6B7280]">{label}</p>
      <p className={`text-[1.875rem] font-black tabular-nums ${error ? 'text-[#ba1a1a]' : 'text-[#0D1B2A]'}`}>
        {loading ? '—' : value}
      </p>
    </button>
  );
}

export default function DashboardMairie() {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [zoneName, setZoneName] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api.request('/dashboard/my-zone', {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (d) => {
      setData(d);
      if (d.zone?.code && d.zone?.level) {
        const geoMap = { district: 'districts', region: 'regions', departement: 'depts', commune: 'sous_prefectures' };
        const geoFile = geoMap[d.zone.level];
        if (geoFile) {
          try {
            const geo = await fetch(`/${geoFile}.geojson`).then(r => r.json());
            const feat = geo.features?.find(f => f.properties.code === d.zone.code || f.properties.name === d.zone.code);
            if (feat) setZoneName(feat.properties.name);
          } catch {}
        }
      }
      setLoading(false);
    }).catch(e => { setError(e.message || 'Erreur de chargement'); setLoading(false); });
  }, [token]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F4EFE6]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#E8611A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-[#6B7280] animate-pulse">Chargement de votre tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F4EFE6] px-4">
        <div className="kpi-card text-center max-w-sm">
          <span className="material-symbols-outlined text-[#ba1a1a] text-5xl">error</span>
          <h2 className="text-lg font-bold text-[#0D1B2A] mt-3">Erreur</h2>
          <p className="text-xs text-[#6B7280] mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!data?.stats) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F4EFE6] px-4">
        <div className="kpi-card text-center max-w-sm">
          <span className="text-5xl">📍</span>
          <h2 className="text-lg font-bold text-[#0D1B2A] mt-3">Aucune zone assignée</h2>
          <p className="text-xs text-[#6B7280] mt-2">
            Contactez un administrateur pour vous assigner une zone géographique.
          </p>
        </div>
      </div>
    );
  }

  const { zone, user: userInfo, stats } = data;
  const tauxCollecte = stats.total_ecoles > 0
    ? Math.round((stats.by_status.collected / stats.total_ecoles) * 100)
    : 0;
  const ratioElevesEnseignant = stats.total_enseignants > 0
    ? Math.round(stats.total_eleves / stats.total_enseignants)
    : 0;
  const pctUrbain = stats.total_ecoles > 0
    ? Math.round((stats.by_milieu.urbain / stats.total_ecoles) * 100)
    : 0;
  const pctPublic = stats.total_ecoles > 0
    ? Math.round((stats.by_statut.public / stats.total_ecoles) * 100)
    : 0;

  const besoins = [
    { label: 'Sans eau potable', value: stats.infrastructure.sans_eau, color: '#ba1a1a', total: stats.total_ecoles, filter: 'sans_eau', icon: 'water_drop' },
    { label: 'Sans toilettes', value: stats.infrastructure.sans_toilettes, color: '#E8611A', total: stats.total_ecoles, filter: 'sans_toilettes', icon: 'wc' },
    { label: 'Sans électricité', value: stats.infrastructure.sans_electricite, color: '#d97706', total: stats.total_ecoles, filter: 'sans_electricite', icon: 'bolt' },
    { label: 'Matériaux précaires', value: stats.infrastructure.materiaux_precaires, color: '#4B5563', total: stats.total_ecoles, filter: 'materiaux_precaires', icon: 'construction' },
    { label: 'Manque bancs', value: stats.infrastructure.besoin_bancs, color: '#7C3AED', total: stats.total_ecoles, filter: 'manque_bancs', icon: 'table_chart' },
  ];

  return (
    <div className="h-full overflow-auto bg-[#F4EFE6]">
      <div className="max-w-lg mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5">

        {/* Header */}
        <div className="bg-[#FAF8F3] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="material-symbols-outlined text-[#E8611A] text-[18px]">location_city</span>
            <span className="text-xs font-bold text-[#E8611A] uppercase tracking-wider">
              {ROLE_LABELS[userInfo?.role] || userInfo?.role} &middot; {ZONE_LEVEL_LABELS[zone?.level]} {zoneName || zone?.code}
            </span>
          </div>
          <h2 className="text-lg font-bold text-[#0D1B2A]">
            {userInfo?.organisation || `${userInfo?.prenom} ${userInfo?.nom}`}
          </h2>
          {userInfo?.organisation && (
            <p className="text-xs text-[#6B7280] mt-1">{userInfo?.prenom} {userInfo?.nom}</p>
          )}
        </div>

        {/* Résumé rapide */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Élèves', value: stats.total_eleves.toLocaleString('fr-FR'), icon: 'groups', color: '#E8611A' },
            { label: 'Écoles', value: stats.total_ecoles, icon: 'school', color: '#0B7A3E' },
            { label: 'Enseignants', value: stats.total_enseignants, icon: 'person', color: '#475569' },
          ].map(k => (
            <div key={k.label} className="bg-[#FAF8F3] rounded-xl p-3 text-center shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
              <span className="material-symbols-outlined text-[20px]" style={{ color: k.color }}>{k.icon}</span>
              <p className="text-lg font-black text-[#0D1B2A] mt-0.5">{k.value}</p>
              <p className="text-[9px] font-bold text-[#94A3B8] uppercase">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Caractéristiques */}
        <div className="bg-[#FAF8F3] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <h3 className="text-sm font-bold text-[#0D1B2A] mb-3">Caractéristiques</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Ratio élèves/enseignant', value: `${ratioElevesEnseignant}:1`, icon: 'calculate' },
              { label: 'Taux de collecte', value: `${tauxCollecte}%`, icon: 'data_check' },
              { label: 'Milieu urbain', value: `${pctUrbain}%`, icon: 'location_city' },
              { label: 'Écoles publiques', value: `${pctPublic}%`, icon: 'account_balance' },
              { label: 'Primaire', value: stats.by_niveau.primaire || 0, icon: 'child_care' },
              { label: 'Secondaire', value: stats.by_niveau.secondaire || 0, icon: 'science' },
            ].map(c => (
              <div key={c.label} className="flex items-center gap-2 bg-[#F4EFE6] rounded-lg p-2">
                <span className="material-symbols-outlined text-[16px] text-[#E8611A]">{c.icon}</span>
                <div>
                  <p className="text-sm font-black text-[#0D1B2A]">{c.value}</p>
                  <p className="text-[9px] font-bold text-[#94A3B8] uppercase">{c.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <KPICard
            icon="school" label="Écoles" value={stats.total_ecoles}
            badge={`${tauxCollecte}%`} badgeBg="#0B7A3E"
            onClick={() => navigate(`/explorer/${zone.level}/${zone.code}?show_points=1`)}
          />
          <KPICard
            icon="groups" label="Élèves"
            value={stats.total_eleves.toLocaleString('fr-FR')}
            badge={`${stats.taux_filles_pct}% filles`} badgeBg="#E8611A"
            onClick={() => navigate(`/explorer/${zone.level}/${zone.code}?show_points=1`)}
          />
          <KPICard
            icon="water_drop" label="Sans eau"
            value={stats.infrastructure.sans_eau}
            error={stats.infrastructure.sans_eau > 0}
            badge={stats.infrastructure.sans_eau > 0 ? 'Urgence' : 'OK'}
            badgeBg={stats.infrastructure.sans_eau > 0 ? '#ba1a1a' : '#0B7A3E'}
            onClick={() => navigate(`/explorer/${zone.level}/${zone.code}?filter=sans_eau&show_points=1`)}
          />
          <KPICard
            icon="person" label="Enseignants"
            value={stats.total_enseignants.toLocaleString('fr-FR')}
            badge={`${Math.round(stats.total_eleves / Math.max(1, stats.total_enseignants))}:1`} badgeBg="#475569"
            onClick={() => navigate(`/explorer/${zone.level}/${zone.code}?show_points=1`)}
          />
        </div>

        {/* Statut collecte */}
        <div className="bg-[#FAF8F3] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <h3 className="text-sm font-bold text-[#0D1B2A] mb-3">Statut de collecte</h3>
          <div className="space-y-2.5">
            {[
              { label: 'Collectées', count: stats.by_status.collected, color: '#0B7A3E', filter: 'collected' },
              { label: 'En attente', count: stats.by_status.waiting, color: '#E8611A', filter: 'waiting' },
              { label: 'Non programmées', count: stats.by_status.pending, color: '#94A3B8', filter: 'pending' },
            ].map(s => (
              <button key={s.label} onClick={() => navigate(`/explorer/${zone.level}/${zone.code}?status=${s.filter}&show_points=1`)}
                className="w-full text-left hover:bg-[#F4EFE6] rounded-lg p-1.5 -m-1.5 transition-colors cursor-pointer">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-[#1E293B]">{s.label}</span>
                  <span className="font-bold" style={{ color: s.color }}>{s.count} / {stats.total_ecoles}</span>
                </div>
                <Jauge value={s.count} max={stats.total_ecoles} color={s.color} />
              </button>
            ))}
          </div>
        </div>

        {/* Parité */}
        <div className="bg-[#FAF8F3] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <h3 className="text-sm font-bold text-[#0D1B2A] mb-3">Parité filles/garçons</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold text-[#E8611A]">Filles {stats.taux_filles_pct}%</span>
                <span className="font-bold text-[#0D1B2A]">{100 - stats.taux_filles_pct}% Garçons</span>
              </div>
              <div className="w-full h-3 bg-[#dee8ff] rounded-full overflow-hidden flex">
                <div className="h-full bg-[#E8611A] rounded-l-full" style={{ width: `${stats.taux_filles_pct}%` }} />
                <div className="h-full bg-[#0D1B2A] rounded-r-full" style={{ width: `${100 - stats.taux_filles_pct}%` }} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="text-center bg-[#F4EFE6] rounded-lg p-2">
              <p className="text-lg font-black text-[#E8611A]">{stats.total_filles.toLocaleString('fr-FR')}</p>
              <p className="text-[10px] font-bold text-[#6B7280] uppercase">Filles</p>
            </div>
            <div className="text-center bg-[#F4EFE6] rounded-lg p-2">
              <p className="text-lg font-black text-[#0D1B2A]">{stats.total_garcons.toLocaleString('fr-FR')}</p>
              <p className="text-[10px] font-bold text-[#6B7280] uppercase">Garçons</p>
            </div>
          </div>
        </div>

        {/* Infrastructure */}
        <div className="bg-[#FAF8F3] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <h3 className="text-sm font-bold text-[#0D1B2A] mb-3">Infrastructure</h3>
          <div className="space-y-2.5">
            {besoins.map(b => (
              <button key={b.label} onClick={() => navigate(`/explorer/${zone.level}/${zone.code}?filter=${b.filter}&show_points=1`)}
                className="w-full text-left hover:bg-[#F4EFE6] rounded-lg p-2 -m-2 transition-colors cursor-pointer group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-[#94A3B8] group-hover:text-[#E8611A] transition-colors">{b.icon}</span>
                    <span className="text-xs font-semibold text-[#1E293B]">{b.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs" style={{ color: b.color }}>{b.value}</span>
                    <span className="material-symbols-outlined text-[12px] text-[#CBD5E1] group-hover:text-[#E8611A] transition-colors">arrow_forward</span>
                  </div>
                </div>
                <Jauge value={b.value} max={b.total} color={b.color} />
              </button>
            ))}
          </div>
        </div>

        {/* Par milieu */}
        <div className="bg-[#FAF8F3] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <h3 className="text-sm font-bold text-[#0D1B2A] mb-3">Répartition par milieu</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center bg-[#F4EFE6] rounded-lg p-3">
              <span className="material-symbols-outlined text-[#E8611A] text-[22px]">location_city</span>
              <p className="text-lg font-black text-[#0D1B2A] mt-1">{stats.by_milieu.urbain}</p>
              <p className="text-[10px] font-bold text-[#6B7280] uppercase">Urbain</p>
            </div>
            <div className="text-center bg-[#F4EFE6] rounded-lg p-3">
              <span className="material-symbols-outlined text-[#0B7A3E] text-[22px]">landscape</span>
              <p className="text-lg font-black text-[#0D1B2A] mt-1">{stats.by_milieu.rural}</p>
              <p className="text-[10px] font-bold text-[#6B7280] uppercase">Rural</p>
            </div>
          </div>
        </div>

        {/* Top écoles à besoins */}
        {stats.top_ecoles_besoin?.length > 0 && (
          <div className="bg-[#FAF8F3] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
            <h3 className="text-sm font-bold text-[#0D1B2A] mb-3">Top écoles à besoins</h3>
            <div className="space-y-2">
              {stats.top_ecoles_besoin.slice(0, 5).map((e, i) => (
                <div key={e.id} className="flex items-center gap-3 bg-[#F4EFE6] rounded-lg p-2.5">
                  <span className="text-lg font-black text-[#E8611A] w-6 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#0D1B2A] truncate">{e.nom}</p>
                    <p className="text-[10px] text-[#6B7280]">{e.eleves} élèves &middot; {e.besoins} bancs manquants</p>
                  </div>
                  <div className="flex gap-1">
                    {e.sans_eau && <span className="w-5 h-5 rounded-full bg-[#ba1a1a]/10 flex items-center justify-center"><span className="material-symbols-outlined text-[12px] text-[#ba1a1a]">water_drop</span></span>}
                    {e.sans_toilettes && <span className="w-5 h-5 rounded-full bg-[#E8611A]/10 flex items-center justify-center"><span className="material-symbols-outlined text-[12px] text-[#E8611A]">wc</span></span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2.5 pb-4">
          <button className="btn-secondary w-full flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[20px]">description</span> Exporter le rapport
          </button>
          <button onClick={() => navigate(`/explorer/${zone.level}/${zone.code}?show_points=1`)}
            className="btn-primary w-full flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[20px]">map</span> Explorer la carte
          </button>
        </div>
      </div>
    </div>
  );
}
