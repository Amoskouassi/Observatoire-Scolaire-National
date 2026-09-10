export default function DashboardInstitution() {
  return (
    <div className="h-full overflow-auto bg-surface">
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-5">
        <h1 className="text-headline-sm text-ivoire-nuit font-black">Espace Institutions & Bailleurs</h1>

        <div className="grid grid-cols-3 gap-3">
          <div className="kpi-card text-center">
            <span className="material-symbols-outlined text-ivoire-orange text-[20px]">folder</span>
            <p className="text-kpi-metric-mobile text-ivoire-nuit mt-1">—</p>
            <p className="text-label-sm text-ivoire-gris">Projets actifs</p>
          </div>
          <div className="kpi-card text-center">
            <span className="material-symbols-outlined text-ivoire-vert text-[20px]">school</span>
            <p className="text-kpi-metric-mobile text-ivoire-nuit mt-1">—</p>
            <p className="text-label-sm text-ivoire-gris">Écoles couvertes</p>
          </div>
          <div className="kpi-card text-center">
            <span className="material-symbols-outlined text-ivoire-orange text-[20px]">bar_chart</span>
            <p className="text-kpi-metric-mobile text-ivoire-nuit mt-1">—</p>
            <p className="text-label-sm text-ivoire-gris">Exports</p>
          </div>
        </div>

        <div className="bg-ivoire-blanc rounded-xl p-4 shadow-card">
          <h3 className="text-headline-sm text-ivoire-nuit text-sm mb-2">Mes dossiers</h3>
          <p className="text-body-sm text-ivoire-gris">Créez et suivez vos dossiers d'étude ou d'audit.</p>
          <button className="btn-secondary mt-3">+ Nouveau dossier</button>
        </div>

        <div className="bg-ivoire-blanc rounded-xl p-4 shadow-card">
          <h3 className="text-headline-sm text-ivoire-nuit text-sm mb-2">Exports de données</h3>
          <p className="text-body-sm text-ivoire-gris">Exportez les données brutes au format CSV ou GeoJSON.</p>
          <div className="flex gap-2 mt-3">
            <button className="btn-ghost border border-ivoire-frontiere">📥 CSV</button>
            <button className="btn-ghost border border-ivoire-frontiere">📥 GeoJSON</button>
          </div>
        </div>
      </div>
    </div>
  );
}
