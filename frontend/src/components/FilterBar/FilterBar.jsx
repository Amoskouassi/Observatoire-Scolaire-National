import { useMapStore } from '../../stores/mapStore';

export default function FilterBar() {
  const { filters, setFilter, resetFilters, schoolsLoading } = useMapStore();

  return (
    <div className="absolute top-20 left-4 right-4 z-20 animate-fade-in-up">
      <div className="bg-ivoire-blanc rounded-xl p-3 shadow-card flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-label-sm text-ivoire-nuit uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-ivoire-orange text-[16px]">tune</span>
            Filtres
          </span>
          <button onClick={resetFilters} className="text-label-sm text-ivoire-gris hover:text-ivoire-orange transition-colors">
            Réinitialiser
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <FilterChip
            active={filters.collect_status.includes('collected')}
            onClick={() => setFilter('collect_status', filters.collect_status.includes('collected') ? [] : ['collected'])}
            label="Collecté"
            icon="check"
          />
          <FilterChip
            active={filters.collect_status.includes('waiting')}
            onClick={() => setFilter('collect_status', filters.collect_status.includes('waiting') ? [] : ['waiting'])}
            label="En attente"
            icon="check"
          />
          <FilterChip
            active={filters.manque_bancs}
            onClick={() => setFilter('manque_bancs', !filters.manque_bancs)}
            label="Manque bancs"
            icon="check"
          />
          <FilterChip
            active={filters.milieu.includes('rural')}
            onClick={() => setFilter('milieu', filters.milieu.includes('rural') ? [] : ['rural'])}
            label="Zone rurale"
            icon="add"
          />
        </div>

        {schoolsLoading && (
          <span className="text-[10px] text-ivoire-orange animate-pulse">Chargement…</span>
        )}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, label, icon }) {
  return (
    <button
      onClick={onClick}
      className={`filter-chip ${active ? 'filter-chip-active' : 'filter-chip-inactive'}`}
    >
      <span className={`material-symbols-outlined text-[15px] ${active ? '' : 'text-ivoire-gris'}`}>
        {active ? 'check' : icon}
      </span>
      {label}
    </button>
  );
}
