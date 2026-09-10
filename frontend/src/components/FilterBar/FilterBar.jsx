import { useMapStore } from '../../stores/mapStore';

export default function FilterBar() {
  const { filters, setFilter, resetFilters, schoolsLoading } = useMapStore();

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 animate-fade-in-up">
      <div className="filter-panel flex items-center gap-3 flex-wrap shadow-lg">
        <span className="text-[10px] text-gray-400 font-black uppercase">🔍 Filtres</span>

        <select
          className="filter-select w-36"
          value={filters.collect_status[0] || ''}
          onChange={(e) => setFilter('collect_status', e.target.value ? [e.target.value] : [])}
        >
          <option value="">Statut collecte</option>
          <option value="collected">🟡 Collecté</option>
          <option value="waiting">🟢 En attente</option>
          <option value="pending">⚪ Non programmé</option>
        </select>

        <select
          className="filter-select w-28"
          value={filters.milieu[0] || ''}
          onChange={(e) => setFilter('milieu', e.target.value ? [e.target.value] : [])}
        >
          <option value="">Milieu</option>
          <option value="urbain">🏙️ Urbain</option>
          <option value="rural">🌿 Rural</option>
        </select>

        <select
          className="filter-select w-28"
          value={filters.niveau[0] || ''}
          onChange={(e) => setFilter('niveau', e.target.value ? [e.target.value] : [])}
        >
          <option value="">Niveau</option>
          <option value="primaire">Primaire</option>
          <option value="secondaire">Secondaire</option>
        </select>

        <label className="flex items-center gap-1 text-[11px] text-gray-600 font-bold cursor-pointer">
          <input
            type="checkbox"
            checked={filters.manque_bancs}
            onChange={(e) => setFilter('manque_bancs', e.target.checked)}
            className="filter-checkbox"
          />
          🪑 Manque de bancs
        </label>

        <button onClick={resetFilters} className="btn-ghost text-[10px] py-1">
          ✕ Réinitialiser
        </button>

        {schoolsLoading && (
          <span className="text-[10px] text-akwa-orange animate-pulse">Chargement…</span>
        )}
      </div>
    </div>
  );
}
