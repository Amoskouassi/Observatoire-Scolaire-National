export default function DashboardInstitution() {
  return (
    <div className="h-full overflow-auto bg-akwa-beige">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-xl font-black text-akwa-texte">🌍 Espace Institutions & Bailleurs</h1>
        <p className="text-sm text-gray-500 mt-1">Suivi des projets et analyses personnalisées</p>

        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {[
            { label: 'Projets actifs', value: '—', icon: '📁' },
            { label: 'Écoles couvertes', value: '—', icon: '🏫' },
            { label: 'Données exportées', value: '—', icon: '📊' },
          ].map((kpi) => (
            <div key={kpi.label} className="card text-center">
              <span className="text-2xl">{kpi.icon}</span>
              <p className="text-xl font-black text-akwa-orange mt-2">{kpi.value}</p>
              <p className="text-[11px] text-gray-500 font-bold">{kpi.label}</p>
            </div>
          ))}
        </div>

        <div className="card mt-8">
          <h3 className="text-xs font-black text-gray-400 uppercase mb-3">Mes dossiers</h3>
          <p className="text-sm text-gray-500">Créez et suivez vos dossiers d'étude ou d'audit.</p>
          <button className="btn-secondary mt-3">+ Nouveau dossier</button>
        </div>

        <div className="card mt-4">
          <h3 className="text-xs font-black text-gray-400 uppercase mb-3">Exports de données</h3>
          <p className="text-sm text-gray-500">Exportez les données brutes au format CSV ou GeoJSON pour vos analyses.</p>
          <div className="flex gap-2 mt-3">
            <button className="btn-ghost border border-akwa-frontiere">📥 CSV</button>
            <button className="btn-ghost border border-akwa-frontiere">📥 GeoJSON</button>
          </div>
        </div>
      </div>
    </div>
  );
}
