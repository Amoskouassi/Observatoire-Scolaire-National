import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';

const DEMO = {
  id: 'demo', code_mena: 'PRIM-0420192', nom_etablissement: 'EPP Kotobi', statut: 'public',
  niveau_enseignement: 'primaire', milieu_implantation: 'rural', annee_creation: 1987,
  nombre_filles: 222, nombre_garcons: 260, enseignants_presents: 7, salles_classe_total: 8,
  toilettes_filles_fonctionnelles: false, eau_potable: false, electricite: false,
  inventaire_classes: [
    { classe: 'CP1', filles: 35, garcons: 42, bancs_actifs: 20, besoin_bancs: 28 },
    { classe: 'CP2', filles: 30, garcons: 38, bancs_actifs: 18, besoin_bancs: 25 },
    { classe: 'CE1', filles: 28, garcons: 35, bancs_actifs: 22, besoin_bancs: 20 },
    { classe: 'CE2', filles: 32, garcons: 40, bancs_actifs: 24, besoin_bancs: 24 },
    { classe: 'CM1', filles: 25, garcons: 30, bancs_actifs: 20, besoin_bancs: 17 },
    { classe: 'CM2', filles: 22, garcons: 28, bancs_actifs: 18, besoin_bancs: 16 },
  ],
};

export default function SchoolDetail() {
  const { id } = useParams();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = id === 'demo' ? DEMO : null;
    if (data) { setSchool(data); setLoading(false); return; }
    api.getSchool(id).then(setSchool).catch(() => setSchool(DEMO)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="h-full bg-[#F4EFE6] flex items-center justify-center"><div className="w-12 h-12 rounded-full border-4 border-[#E8611A]/20 border-t-[#E8611A] animate-spin" /></div>;
  if (!school) return <div className="h-full bg-[#F4EFE6] flex flex-col items-center justify-center gap-3"><span className="text-4xl">🏫</span><h2 className="text-lg font-bold text-[#0D1B2A]">Non trouvée</h2><Link to="/explorer" className="text-[#E8611A] underline text-sm font-bold">Retour</Link></div>;

  const total = school.nombre_filles + school.nombre_garcons;
  const pctF = total > 0 ? Math.round((school.nombre_filles / total) * 100) : 0;

  return (
    <div className="h-full overflow-auto bg-[#F4EFE6]">
      <div className="max-w-lg mx-auto">
        {/* Breadcrumb */}
        <nav className="px-4 py-2.5 bg-[#f0f3ff] flex items-center gap-1.5 text-[11px] text-[#6B7280] overflow-x-auto no-scrollbar">
          <Link to="/explorer" className="hover:text-[#E8611A] shrink-0 no-underline text-[#6B7280]">Côte d'Ivoire</Link>
          <span className="material-symbols-outlined text-[12px] opacity-40 shrink-0">chevron_right</span>
          <span className="font-bold text-[#E8611A] shrink-0">{school.nom_etablissement}</span>
        </nav>

        {/* Hero */}
        <div className="relative w-full aspect-video bg-[#0D1B2A] overflow-hidden">
          <div className="w-full h-full bg-gradient-to-br from-[#E8611A]/20 to-[#0D1B2A]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D1B2A]/90 via-transparent to-transparent" />
          <div className="absolute top-3 left-3 right-3 flex justify-between">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF8F3]/90 backdrop-blur text-[10px] font-bold text-[#0D1B2A]">
              <span className="material-symbols-outlined text-[13px] text-[#0B7A3E]">verified</span> Données DRENA 2024
            </span>
            <button className="w-8 h-8 rounded-full bg-[#FAF8F3]/80 backdrop-blur flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px] text-[#0D1B2A]">bookmark_border</span>
            </button>
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <span className="px-2 py-0.5 rounded-full bg-[#E8611A] text-white text-[9px] uppercase font-bold">EPP Publique</span>
            <h1 className="text-[1.5rem] font-black text-white mt-1 drop-shadow-sm">{school.nom_etablissement}</h1>
          </div>
        </div>

        <div className="px-4 py-4 flex flex-col gap-4">
          {/* Badges */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#dee8ff] text-[11px] font-bold text-[#1E293B] shrink-0">
              <span className="material-symbols-outlined text-[14px] text-[#E8611A]">school</span> CP1 → CM2
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#dee8ff] text-[11px] font-bold text-[#1E293B] shrink-0">
              <span className="material-symbols-outlined text-[14px] text-[#6B7280]">landscape</span> Zone Rurale
            </span>
            <span className="px-2.5 py-1 rounded-full bg-[#e7eeff] text-[11px] font-bold text-[#0D1B2A] font-mono shrink-0">{school.code_mena}</span>
          </div>

          {/* 4 KPIs */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-[#FAF8F3] shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between text-[#6B7280]">
                <span className="text-[11px] font-bold uppercase">Effectif</span>
                <span className="material-symbols-outlined text-[18px] text-[#0B7A3E]">groups</span>
              </div>
              <span className="text-[1.875rem] font-black text-[#1E293B] tabular-nums mt-1 block">{total}</span>
              <span className="text-[10px] text-[#6B7280]">vs rentrée 2023</span>
            </div>
            <div className="p-3 rounded-xl bg-[#FAF8F3] shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between text-[#E8611A]">
                <span className="text-[11px] font-bold uppercase">Élèves/Banc</span>
                <span className="material-symbols-outlined text-[18px]">chair_alt</span>
              </div>
              <span className="text-[1.875rem] font-black text-[#E8611A] tabular-nums mt-1 block">2.8</span>
              <span className="text-[10px] text-[#E8611A] font-bold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E8611A] animate-pulse" /> Déficit 84 bancs
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#ffdad6]/40 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between text-[#ba1a1a]">
                <span className="text-[11px] font-bold uppercase">Eau & Hygiène</span>
                <span className="material-symbols-outlined text-[18px]">faucet</span>
              </div>
              <span className="text-[1.875rem] font-black text-[#ba1a1a] tabular-nums mt-1 block">0</span>
              <span className="inline-block px-1.5 py-0.5 rounded bg-[#ba1a1a]/15 text-[#ba1a1a] text-[10px] font-bold">Urgence Sanitaire</span>
            </div>
            <div className="p-3 rounded-xl bg-[#FAF8F3] shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between text-[#6B7280]">
                <span className="text-[11px] font-bold uppercase">Enseignants</span>
                <span className="material-symbols-outlined text-[18px]">co_present</span>
              </div>
              <span className="text-[1.875rem] font-black text-[#1E293B] tabular-nums mt-1 block">{school.enseignants_presents}</span>
              <span className="text-[10px] text-[#6B7280]">/ {school.salles_classe_total} classes</span>
            </div>
          </div>

          {/* Parité */}
          <div className="p-3.5 rounded-xl bg-[#FAF8F3] shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-sm font-bold text-[#1E293B]">
                <span className="material-symbols-outlined text-[#E8611A] text-[18px]">balance</span> Parité
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#e7eeff] text-[10px] font-bold text-[#0D1B2A]">IPG: {(school.nombre_garcons / school.nombre_filles).toFixed(2)}</span>
            </div>
            <div className="w-full h-4 rounded-full bg-[#e7eeff] overflow-hidden flex p-0.5 gap-0.5">
              <div className="h-full rounded-l-full bg-[#E8611A] flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${pctF}%` }}>{pctF}%</div>
              <div className="h-full rounded-r-full bg-[#0B7A3E] flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${100 - pctF}%` }}>{100 - pctF}%</div>
            </div>
            <div className="flex justify-between text-xs font-bold mt-1.5">
              <span className="text-[#E8611A]">{school.nombre_filles} Filles ({pctF}%)</span>
              <span className="text-[#0B7A3E]">{school.nombre_garcons} Garçons ({100 - pctF}%)</span>
            </div>
          </div>

          {/* Inventaire */}
          {school.inventaire_classes?.length > 0 && (
            <div className="rounded-xl bg-[#FAF8F3] shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-3.5">
              <h3 className="text-sm font-bold text-[#1E293B] mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#E8611A] text-[18px]">table_chart</span> Inventaire par classe
              </h3>
              <div className="space-y-2">
                {school.inventaire_classes.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-[#F4EFE6]">
                    <span className="font-bold text-[#1E293B] w-10">{c.classe}</span>
                    <span className="text-[#6B7280]">👧{c.filles} 👦{c.garcons} 🪑{c.bancs_actifs}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c.besoin_bancs > 0 ? 'bg-[#ffdad6] text-[#ba1a1a]' : 'bg-[#93f5ab] text-[#0B7A3E]'}`}>
                      {c.besoin_bancs > 0 ? `+${c.besoin_bancs}` : 'OK'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <button className="btn-secondary w-full flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[20px]">campaign</span> Générer l'affiche de plaidoyer
          </button>
        </div>
      </div>
    </div>
  );
}
