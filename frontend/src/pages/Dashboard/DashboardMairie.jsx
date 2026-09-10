export default function DashboardMairie() {
  return (
    <div className="h-full overflow-auto bg-akwa-beige">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-xl font-black text-akwa-texte">🏛️ Espace Décideur — Mairie</h1>
        <p className="text-sm text-gray-500 mt-1">Tableau de bord personnalisé pour votre commune</p>

        <div className="grid md:grid-cols-4 gap-4 mt-8">
          {[
            { label: 'Écoles collectées', value: '—', icon: '📋' },
            { label: 'Taux de collecte', value: '—', icon: '📊' },
            { label: 'Élèves recensés', value: '—', icon: '👧' },
            { label: 'Besoins prioritaires', value: '—', icon: '⚠️' },
          ].map((kpi) => (
            <div key={kpi.label} className="card text-center">
              <span className="text-2xl">{kpi.icon}</span>
              <p className="text-xl font-black text-akwa-orange mt-2">{kpi.value}</p>
              <p className="text-[11px] text-gray-500 font-bold">{kpi.label}</p>
            </div>
          ))}
        </div>

        <div className="card mt-8">
          <h3 className="text-xs font-black text-gray-400 uppercase mb-3">Évolution de la collecte</h3>
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            Graphique Recharts (à venir)
          </div>
        </div>

        <div className="card mt-4">
          <h3 className="text-xs font-black text-gray-400 uppercase mb-3">Affiches de plaidoyer</h3>
          <p className="text-sm text-gray-500">Générez des affiches PNG pour vos réunions de quartier et conseils municipaux.</p>
          <button className="btn-primary mt-3">📄 Générer une affiche</button>
        </div>
      </div>
    </div>
  );
}
