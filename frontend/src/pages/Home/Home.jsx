import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="h-full overflow-auto bg-surface">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <span className="text-5xl">🇨🇮</span>
          <h1 className="text-headline-lg-mobile text-ivoire-nuit mt-3 font-black tracking-tight">
            Observatoire Scolaire National
          </h1>
          <p className="text-body-md text-ivoire-gris mt-2 max-w-xl mx-auto">
            Cartographie interactive des établissements scolaires de Côte d'Ivoire.
          </p>
          <div className="flex justify-center gap-3 mt-5">
            <Link to="/explorer" className="btn-primary no-underline inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">map</span>
              Explorer la Carte
            </Link>
            <Link to="/tarifs" className="btn-ghost no-underline border border-ivoire-frontiere">
              Voir les Tarifs
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {[
            { value: '34', label: 'Districts', icon: 'map' },
            { value: '31', label: 'Régions', icon: 'public' },
            { value: '82', label: 'Départements', icon: 'location_on' },
            { value: '~2 500', label: 'Communes', icon: 'location_city' },
          ].map((stat) => (
            <div key={stat.label} className="kpi-card">
              <span className="material-symbols-outlined text-ivoire-orange text-[20px]">{stat.icon}</span>
              <p className="text-kpi-metric-mobile text-ivoire-texte mt-1 tabular-nums">{stat.value}</p>
              <p className="text-label-sm text-ivoire-gris">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: 'map', title: 'Carte Interactive', desc: 'Naviguez du pays à l\'école avec une cartographie en cascade.' },
            { icon: 'bar_chart', title: 'Tableaux de Bord', desc: 'KPIs : parité, alphabétisation, besoins en infrastructures.' },
            { icon: 'edit_location', title: 'Collecte Terrain', desc: 'Formulaire intelligent hors-ligne, classe par classe.' },
          ].map((f) => (
            <div key={f.title} className="kpi-card">
              <span className="material-symbols-outlined text-ivoire-orange text-[24px]">{f.icon}</span>
              <h3 className="text-label-md text-ivoire-nuit mt-2">{f.title}</h3>
              <p className="text-body-sm text-ivoire-gris mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
