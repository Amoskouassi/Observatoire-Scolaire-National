export default function DashboardMairie() {
  return (
    <div className="h-full overflow-auto bg-surface">
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-5">
        {/* En-tête */}
        <div className="bg-ivoire-blanc rounded-xl p-4 shadow-card relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-ivoire-orange/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="material-symbols-outlined text-ivoire-orange text-[18px]">location_city</span>
                <span className="text-label-sm text-ivoire-orange uppercase tracking-wider font-bold">Mairie & District des Savanes</span>
              </div>
              <h2 className="text-headline-sm text-ivoire-nuit tracking-tight truncate">Mairie de Korhogo</h2>
            </div>
            <span className="badge bg-ivoire-vert/10 text-ivoire-vert shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-ivoire-vert" />
              Accrédité DRENA
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-high/60 text-ivoire-texte text-label-sm">
              <span className="material-symbols-outlined text-[15px] text-ivoire-gris">calendar_today</span>
              Année Scolaire 2023-2024
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-ivoire-beige text-ivoire-gris text-label-sm">
              <span className="material-symbols-outlined text-[15px] text-ivoire-vert">verified_user</span>
              Audit Validé UNICEF / BM
            </span>
          </div>
        </div>

        {/* 4 KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <DashboardKPI icon="school" label="Écoles recensées" value="142" sub="Total communal actif" badge="100% Géo" badgeColor="ivoire-vert" />
          <DashboardKPI icon="groups" label="Classes > 50 élèves" value="38%" sub="54 sections critiques" badge="Alerte" badgeColor="ivoire-orange" alert />
          <DashboardKPI icon="water_drop" label="Sans eau potable" value="54" sub="Sites sans forage actif" badge="Urgence" badgeColor="error" errorCard />
          <DashboardKPI icon="account_balance_wallet" label="Budget mise à niveau" value="320M" sub="Chiffrage standardisé" badge="Estimation" badgeColor="ivoire-vert" />
        </div>

        {/* Filtres */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-label-sm text-ivoire-nuit uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-ivoire-orange text-[16px]">tune</span>
              Filtres multi-critères
            </span>
            <span className="text-label-sm text-ivoire-gris">3 filtres actifs</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button className="filter-chip-active">
              <span className="material-symbols-outlined text-[15px]">check</span> Sans latrines
            </button>
            <button className="filter-chip-active">
              <span className="material-symbols-outlined text-[15px]">check</span> Toiture paille/bambou
            </button>
            <button className="filter-chip-active">
              <span className="material-symbols-outlined text-[15px]">check</span> Ratio bancs critique
            </button>
            <button className="filter-chip-inactive">
              <span className="material-symbols-outlined text-[15px] text-ivoire-gris">add</span> Zone rurale isolée
            </button>
          </div>
        </div>

        {/* Verdict IA */}
        <div className="bg-ivoire-blanc rounded-xl p-4 shadow-card relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-primary-fixed text-ivoire-orange">
                <span className="material-symbols-outlined text-[18px]">psychology</span>
              </span>
              <h3 className="text-headline-sm text-ivoire-nuit text-sm">Verdict & Analyse Prédictive IA</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-ivoire-orange/10 text-ivoire-orange text-label-sm font-bold animate-pulse">Priorité Haute</span>
          </div>
          <div className="bg-ivoire-beige/70 rounded-lg p-3 mb-3">
            <p className="text-body-md text-ivoire-texte text-[13px] leading-relaxed">
              <strong className="font-bold text-ivoire-nuit">Verdict d'urgence communale :</strong> 14 écoles du <span className="text-ivoire-orange font-bold">secteur Nord-Est</span> nécessitent une intervention prioritaire avant la rentrée de septembre. Priorité absolue : réfection urgente des forages hydrauliques et acheminement de <span className="font-bold text-ivoire-vert">1 200 tables-bancs homologués</span>.
            </p>
          </div>
          <div className="flex items-center justify-between text-ivoire-gris text-label-sm pt-1">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-ivoire-vert">verified</span>
              Confiance modèle : 94.2%
            </span>
            <span className="text-ivoire-orange font-bold">Arbitrage immédiat requis</span>
          </div>
        </div>

        {/* Barres besoins */}
        <div className="bg-ivoire-blanc rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-headline-sm text-ivoire-nuit text-sm">Répartition des Besoins</h3>
          </div>
          <div className="space-y-3.5">
            <BarreBesoin icon="chair" label="Tables-bancs scolaires" pct={42} count="60 écoles" color="ivoire-orange" />
            <BarreBesoin icon="wc" label="Blocs de latrines VIP" pct={28} count="40 écoles" color="ivoire-vert" />
            <BarreBesoin icon="roofing" label="Réfection toitures" pct={18} count="26 écoles" color="ivoire-gris-carte" />
            <BarreBesoin icon="wb_sunny" label="Électrification solaire" pct={12} count="16 écoles" color="amber-500" />
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-2.5 pb-4">
          <button className="btn-secondary w-full flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[20px]">description</span>
            Exporter le rapport budgétaire
          </button>
          <button className="btn-primary w-full flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[20px]">calculate</span>
            Simuler une dotation municipale
          </button>
        </div>
      </div>
    </div>
  );
}

function DashboardKPI({ icon, label, value, sub, badge, badgeColor, alert, errorCard }) {
  return (
    <div className={`p-3.5 rounded-xl shadow-card flex flex-col justify-between relative overflow-hidden ${errorCard ? 'bg-error-container/40' : 'bg-ivoire-blanc'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`p-1.5 rounded-lg ${errorCard ? 'bg-error-container text-error' : 'bg-surface-container text-ivoire-nuit'}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </span>
        <span className={`text-label-sm ${badgeColor === 'error' ? 'bg-error/10 text-error' : `bg-${badgeColor}/10 text-${badgeColor}`} px-1.5 py-0.5 rounded-full font-bold`}>
          {badge}
        </span>
      </div>
      <div>
        <p className="text-label-sm text-ivoire-gris leading-tight mb-1">{label}</p>
        <p className={`text-kpi-metric-mobile tabular-nums tracking-tight ${errorCard ? 'text-error' : alert ? 'text-ivoire-orange' : 'text-ivoire-nuit'}`}>
          {value}
        </p>
        <p className="text-body-sm text-ivoire-gris mt-0.5 truncate">{sub}</p>
      </div>
    </div>
  );
}

function BarreBesoin({ icon, label, pct, count, color }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-label-md text-ivoire-nuit text-xs flex items-center gap-1.5">
          <span className={`material-symbols-outlined text-[16px] text-${color}`}>{icon}</span>
          {label}
        </span>
        <span className={`text-label-sm font-bold text-${color} tabular-nums`}>{pct}% ({count})</span>
      </div>
      <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden">
        <div className={`h-full bg-${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
