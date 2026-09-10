import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMapStore } from '../../stores/mapStore';
import BottomSheet from '../../components/BottomSheet/BottomSheet';
import FilterBar from '../../components/FilterBar/FilterBar';
import CIVMap from '../../components/CIVMap/CIVMap';
import LoadingScreen from '../../components/LoadingScreen/LoadingScreen';

export default function Explorer() {
  const navigate = useNavigate();
  const { currentFeature, openBottomSheet } = useMapStore();
  const [loading] = useState(true);

  return (
    <div className="h-full flex flex-col relative">
      {/* Loading */}
      {loading && <LoadingScreen />}

      {/* Barre de recherche */}
      <div className="px-4 pt-2 pb-3 w-full z-20 sticky top-0 bg-gradient-to-b from-ivoire-beige via-ivoire-beige/95 to-transparent">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-ivoire-blanc rounded-xl px-3.5 py-2.5 shadow-md transition-all">
            <span className="material-symbols-outlined text-ivoire-orange text-[20px] shrink-0 mr-2">search</span>
            <input
              className="w-full bg-transparent text-ivoire-texte text-body-sm placeholder:text-ivoire-gris focus:outline-none"
              placeholder="Rechercher (Korhogo, Cocody, San-Pédro)..."
              type="search"
            />
            <span className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-ivoire-beige text-ivoire-gris text-label-sm text-[10px]">/</span>
          </div>
          <button className="w-11 h-11 rounded-xl bg-ivoire-blanc flex items-center justify-center text-ivoire-texte shadow-md hover:bg-ivoire-beige transition-colors shrink-0">
            <span className="material-symbols-outlined text-[20px]">tune</span>
          </button>
        </div>

        {/* Filtres rapides territoriaux */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2.5">
          <button className="px-3 py-1 rounded-full bg-ivoire-orange text-white text-label-sm uppercase tracking-wide text-[10px] shrink-0 shadow-sm font-bold">
            Tous les Districts
          </button>
          <button className="px-3 py-1 rounded-full bg-ivoire-blanc text-ivoire-texte text-label-sm text-[11px] shrink-0 shadow-sm flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-ivoire-orange" />
            Savanes (98%)
          </button>
          <button className="px-3 py-1 rounded-full bg-ivoire-blanc text-ivoire-texte text-label-sm text-[11px] shrink-0 shadow-sm flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-ivoire-vert" />
            Abidjan (100%)
          </button>
          <button className="px-3 py-1 rounded-full bg-ivoire-blanc text-ivoire-texte text-label-sm text-[11px] shrink-0 shadow-sm flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-ivoire-gris" />
            Montagnes
          </button>
        </div>
      </div>

      {/* Carte */}
      <div className="flex-1 relative">
        <CIVMap />
      </div>

      {/* Bottom Sheet */}
      <BottomSheet>
        <SheetContent onNavigate={navigate} />
      </BottomSheet>
    </div>
  );
}

function SheetContent({ onNavigate }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Fil d'Ariane */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <button className="w-7 h-7 rounded-full bg-ivoire-beige flex items-center justify-center text-ivoire-texte shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          </button>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] uppercase tracking-wider text-ivoire-gris leading-none truncate">
              Côte d'Ivoire › District Focus
            </span>
            <h2 className="font-bold text-ivoire-texte truncate text-headline-sm">
              District des Savanes (Korhogo)
            </h2>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-ivoire-vert/10 text-ivoire-vert text-label-sm text-[10px] uppercase font-bold shrink-0">
          Audit Certifié
        </span>
      </div>

      {/* 3 KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <KPISheet icon="school" label="Écoles" value="1 428" sub="+12 ce mois" color="ivoire-orange" />
        <KPISheet icon="groups" label="Élèves" value="312k" sub="Effectif recensé" color="ivoire-vert" />
        <KPISheet icon="chair" label="Bancs" value="84%" sub="Besoin: 3.2k" color="ivoire-orange" />
      </div>

      {/* Jauge parité */}
      <div className="bg-ivoire-beige/70 rounded-xl p-3 shadow-sm">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-label-sm text-ivoire-texte flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px] text-ivoire-orange">pie_chart</span>
            Indicateur de Parité de Genre
          </span>
          <span className="text-[10px] text-ivoire-gris">Ratio: 0.94</span>
        </div>
        <div className="w-full h-3 bg-ivoire-blanc rounded-full overflow-hidden flex p-0.5 shadow-inner">
          <div className="h-full bg-ivoire-orange rounded-l-full transition-all duration-500" style={{ width: '48.5%' }} />
          <div className="h-full bg-ivoire-vert rounded-r-full transition-all duration-500" style={{ width: '51.5%' }} />
        </div>
        <div className="flex justify-between items-center mt-1.5 text-label-sm">
          <span className="text-ivoire-orange font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-ivoire-orange" />
            Filles 48.5%
          </span>
          <span className="text-ivoire-vert font-bold flex items-center gap-1">
            Garçons 51.5%
            <span className="w-2 h-2 rounded-full bg-ivoire-vert" />
          </span>
        </div>
      </div>

      {/* Régions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-label-sm text-ivoire-gris uppercase tracking-wider">Régions (3)</h3>
          <span className="text-[11px] text-ivoire-orange font-bold">Tout voir</span>
        </div>
        <div className="space-y-2">
          <RegionItem name="Poro (Korhogo)" schools="342" inspections="8" progress="94%" />
          <RegionItem name="Tchologo (Ferkessédougou)" schools="198" inspections="4" progress="82%" alert />
          <RegionItem name="Bagoué (Boundiali)" schools="210" inspections="5" progress="89%" />
        </div>
      </div>

      {/* CTA */}
      <button className="btn-primary w-full flex items-center justify-center gap-2" onClick={() => onNavigate('/explorer')}>
        <span className="material-symbols-outlined text-[18px]">travel_explore</span>
        Explorer les 342 écoles de Korhogo
      </button>
    </div>
  );
}

function KPISheet({ icon, label, value, sub, color }) {
  return (
    <div className="bg-ivoire-beige p-2.5 rounded-xl flex flex-col justify-between shadow-sm">
      <div className="flex items-center gap-1 text-ivoire-gris text-label-sm text-[10px]">
        <span className={`material-symbols-outlined text-[13px] text-${color}`}>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="mt-1">
        <span className="font-bold text-ivoire-texte tabular-nums text-headline-sm">{value}</span>
      </div>
      <span className="text-[9px] text-ivoire-gris text-label-sm">{sub}</span>
    </div>
  );
}

function RegionItem({ name, schools, inspections, progress, alert }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-ivoire-beige/40 hover:bg-ivoire-beige transition-colors group shadow-sm cursor-pointer">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-ivoire-blanc flex items-center justify-center shrink-0 shadow-sm">
          <span className="material-symbols-outlined text-[18px] text-ivoire-orange">location_city</span>
        </div>
        <div className="flex flex-col">
          <span className="text-label-sm text-xs font-bold text-ivoire-texte group-hover:text-ivoire-orange transition-colors">
            Région du {name}
          </span>
          <span className="text-[11px] text-ivoire-gris">
            {schools} Écoles • {inspections} Inspections
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`px-2 py-0.5 rounded-full text-label-sm text-[10px] font-bold ${
          alert ? 'bg-ivoire-orange/15 text-ivoire-orange' : 'bg-ivoire-vert/15 text-ivoire-vert'
        }`}>
          {progress} complété
        </span>
        <span className="material-symbols-outlined text-ivoire-gris text-[18px] group-hover:translate-x-0.5 transition-transform">chevron_right</span>
      </div>
    </div>
  );
}
