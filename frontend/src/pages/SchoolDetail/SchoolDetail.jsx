import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';

export default function SchoolDetail() {
  const { id } = useParams();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id === 'demo') {
      setSchool({
        id: 'demo',
        code_mena: 'PRIM-0420192',
        nom_etablissement: 'EPP Kotobi',
        statut: 'public',
        niveau_enseignement: 'primaire',
        milieu_implantation: 'rural',
        annee_creation: 1987,
        nombre_filles: 222,
        nombre_garcons: 260,
        enseignants_presents: 7,
        salles_classe_total: 8,
        toilettes_filles_fonctionnelles: false,
        eau_potable: false,
        electricite: false,
        inventaire_classes: [
          { classe: 'CP1', filles: 35, garcons: 42, bancs_actifs: 20, besoin_bancs: 28 },
          { classe: 'CP2', filles: 30, garcons: 38, bancs_actifs: 18, besoin_bancs: 25 },
          { classe: 'CE1', filles: 28, garcons: 35, bancs_actifs: 22, besoin_bancs: 20 },
          { classe: 'CE2', filles: 32, garcons: 40, bancs_actifs: 24, besoin_bancs: 24 },
          { classe: 'CM1', filles: 25, garcons: 30, bancs_actifs: 20, besoin_bancs: 17 },
          { classe: 'CM2', filles: 22, garcons: 28, bancs_actifs: 18, besoin_bancs: 16 },
        ],
      });
      setLoading(false);
      return;
    }
    api.getSchool(id)
      .then(setSchool)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="h-full bg-surface flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-ivoire-orange/20 border-t-ivoire-orange animate-spin" />
    </div>
  );
  if (!school) return (
    <div className="h-full bg-surface flex flex-col items-center justify-center gap-3">
      <span className="text-4xl">🏫</span>
      <h2 className="text-headline-sm text-ivoire-nuit">École non trouvée</h2>
      <Link to="/explorer" className="text-ivoire-orange hover:underline text-label-sm font-bold">Retour à la carte</Link>
    </div>
  );

  const totalEleves = school.nombre_filles + school.nombre_garcons;
  const tauxFilles = totalEleves > 0 ? Math.round((school.nombre_filles / totalEleves) * 100) : 0;
  const tauxGarcons = 100 - tauxFilles;

  return (
    <div className="h-full overflow-auto bg-surface">
      <div className="flex flex-col w-full max-w-lg mx-auto">
        {/* Breadcrumb */}
        <div className="px-4 py-2.5 bg-surface-container-low shadow-sm">
          <nav className="flex items-center gap-1.5 overflow-x-auto text-[11px] text-ivoire-gris whitespace-nowrap scrollbar-none">
            <Link to="/explorer" className="hover:text-ivoire-orange transition-colors shrink-0 no-underline text-ivoire-gris">Côte d'Ivoire</Link>
            <span className="material-symbols-outlined text-[12px] opacity-40 shrink-0">chevron_right</span>
            <span className="hover:text-ivoire-orange transition-colors shrink-0 cursor-pointer">Savanes</span>
            <span className="material-symbols-outlined text-[12px] opacity-40 shrink-0">chevron_right</span>
            <span className="font-bold text-ivoire-orange shrink-0">{school.nom_etablissement}</span>
          </nav>
        </div>

        {/* Hero Photo */}
        <div className="relative w-full aspect-video bg-ivoire-nuit overflow-hidden">
          <div className="w-full h-full bg-gradient-to-br from-ivoire-orange/20 to-ivoire-nuit" />
          <div className="absolute inset-0 bg-gradient-to-t from-ivoire-nuit/90 via-ivoire-nuit/30 to-transparent" />

          <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
            <span className="badge bg-ivoire-blanc/90 backdrop-blur-md text-ivoire-nuit text-[10px] shadow-sm">
              <span className="material-symbols-outlined text-[13px] text-ivoire-vert">verified</span>
              Données DRENA 2024
            </span>
            <button className="w-8 h-8 rounded-full bg-ivoire-blanc/80 backdrop-blur-md flex items-center justify-center text-ivoire-nuit shadow-sm active:scale-95 transition-transform">
              <span className="material-symbols-outlined text-[18px]">bookmark_border</span>
            </button>
          </div>

          <div className="absolute bottom-3 inset-x-3 text-white flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-ivoire-orange text-white text-[9px] uppercase tracking-wider font-bold">
                {school.statut === 'public' ? 'EPP Publique' : 'École Privée'}
              </span>
            </div>
            <h1 className="text-headline-lg-mobile text-white drop-shadow-sm font-black">
              {school.nom_etablissement}
            </h1>
          </div>
        </div>

        {/* Contenu */}
        <div className="px-4 py-4 flex flex-col gap-4">
          {/* Badges */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="badge bg-surface-container-high text-ivoire-texte whitespace-nowrap">
              <span className="material-symbols-outlined text-[14px] text-ivoire-orange">school</span>
              CP1 → CM2
            </span>
            <span className="badge bg-surface-container-high text-ivoire-texte whitespace-nowrap">
              <span className="material-symbols-outlined text-[14px] text-ivoire-gris">landscape</span>
              Zone Rurale
            </span>
            <span className="badge bg-surface-container text-ivoire-nuit whitespace-nowrap font-mono tracking-tight">
              {school.code_mena}
            </span>
          </div>

          {/* 4 KPIs */}
          <div className="grid grid-cols-2 gap-2.5">
            <KPI icon="groups" label="Effectif Total" value={totalEleves} sub="vs rentrée 2023" color="ivoire-vert" trend="+12%" />
            <KPI icon="chair_alt" label="Élèves / Banc" value="2.8" sub="/place" color="ivoire-orange" alert="Déficit de 84 bancs" />
            <KPI icon="faucet" label="Eau & Hygiène" value="0" sub="point actif" color="error" alert="Urgence Sanitaire" errorCard />
            <KPI icon="co_present" label="Enseignants" value={school.enseignants_presents} sub={`/ ${school.salles_classe_total} classes`} color="ivoire-gris" alert="1 poste vacant" />
          </div>

          {/* Parité */}
          <div className="p-3.5 rounded-xl bg-ivoire-blanc shadow-card flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-ivoire-orange text-[18px]">balance</span>
                <span className="text-label-md font-bold text-ivoire-texte">Parité Garçons / Filles</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-surface-container text-ivoire-nuit text-[10px] font-bold">
                IPG: {(school.nombre_garcons / Math.max(school.nombre_filles, 1)).toFixed(2)}
              </span>
            </div>
            <div className="w-full h-4 rounded-full bg-surface-container overflow-hidden flex p-0.5 gap-0.5">
              <div className="h-full rounded-l-full bg-ivoire-orange transition-all duration-500 relative flex items-center justify-center text-[9px] font-bold text-white"
                   style={{ width: `${tauxFilles}%` }}>
                {tauxFilles}%
              </div>
              <div className="h-full rounded-r-full bg-ivoire-vert transition-all duration-500 relative flex items-center justify-center text-[9px] font-bold text-white"
                   style={{ width: `${tauxGarcons}%` }}>
                {tauxGarcons}%
              </div>
            </div>
            <div className="flex items-center justify-between text-label-sm">
              <span className="text-ivoire-orange font-bold flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-ivoire-orange" />
                {school.nombre_filles} Filles ({tauxFilles}%)
              </span>
              <span className="text-ivoire-vert font-bold flex items-center gap-1.5">
                {school.nombre_garcons} Garçons ({tauxGarcons}%)
                <span className="w-2.5 h-2.5 rounded-full bg-ivoire-vert" />
              </span>
            </div>
          </div>

          {/* Inventaire par classe */}
          {school.inventaire_classes?.length > 0 && (
            <div className="rounded-xl overflow-hidden shadow-card bg-ivoire-blanc">
              <div className="p-3.5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-label-md font-bold text-ivoire-texte flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-ivoire-orange text-[20px]">table_chart</span>
                    Inventaire par classe
                  </span>
                </div>
                <div className="space-y-2">
                  {school.inventaire_classes.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-ivoire-blanc/80">
                      <span className="font-bold text-ivoire-texte">{c.classe}</span>
                      <span className="text-ivoire-gris">👧 {c.filles} | 👦 {c.garcons} | 🪑 {c.bancs_actifs}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        c.besoin_bancs > 0 ? 'bg-error/10 text-error' : 'bg-ivoire-vert/10 text-ivoire-vert'
                      }`}>
                        {c.besoin_bancs > 0 ? `+${c.besoin_bancs}` : 'OK'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CTA Plaidoyer */}
          <button className="btn-secondary w-full flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[20px]">campaign</span>
            Générer l'affiche de plaidoyer
          </button>
        </div>
      </div>
    </div>
  );
}

function KPI({ icon, label, value, sub, color, trend, alert, errorCard }) {
  return (
    <div className={`p-3 rounded-xl shadow-card flex flex-col justify-between ${errorCard ? 'bg-error-container/40' : 'bg-ivoire-blanc'}`}>
      <div className={`flex items-center justify-between text-${color}`}>
        <span className="text-label-sm uppercase tracking-wider font-semibold">{label}</span>
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </div>
      <div className="mt-1">
        <span className={`text-kpi-metric-mobile font-black tabular-nums ${errorCard ? 'text-error' : `text-${color}`}`}>
          {value}
        </span>
        {trend && (
          <span className="inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded bg-ivoire-vert/10 text-ivoire-vert text-[10px] font-bold">
            <span className="material-symbols-outlined text-[10px]">trending_up</span> {trend}
          </span>
        )}
      </div>
      {alert ? (
        <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-ivoire-orange">
          <span className="w-1.5 h-1.5 rounded-full bg-ivoire-orange animate-pulse-dot" />
          {alert}
        </div>
      ) : (
        <span className="text-[10px] text-ivoire-gris mt-0.5">{sub}</span>
      )}
    </div>
  );
}
