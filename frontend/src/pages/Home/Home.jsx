import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="h-full overflow-auto bg-akwa-beige">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <span className="text-5xl">🇨🇮</span>
          <h1 className="text-3xl md:text-4xl font-black text-akwa-texte mt-4 tracking-tight">
            Observatoire Scolaire National
          </h1>
          <p className="text-akwa-gris mt-3 max-w-2xl mx-auto">
            Cartographie interactive des établissements scolaires de Côte d'Ivoire.
            Explorez les données éducationnelles en temps réel pour éclairer les décisions.
          </p>
          <div className="flex justify-center gap-3 mt-6">
            <Link to="/explorer" className="btn-primary no-underline">
              🗺️ Explorer la Carte
            </Link>
            <Link to="/tarifs" className="btn-ghost no-underline border border-akwa-frontiere">
              💼 Voir les Tarifs
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { value: '34', label: 'Districts', icon: '🗺️' },
            { value: '31', label: 'Régions', icon: '🌍' },
            { value: '82', label: 'Départements', icon: '📍' },
            { value: '~2 500', label: 'Communes', icon: '🏘️' },
          ].map((stat) => (
            <div key={stat.label} className="card text-center">
              <span className="text-2xl">{stat.icon}</span>
              <p className="text-2xl font-black text-akwa-orange mt-2">{stat.value}</p>
              <p className="text-[11px] text-gray-500 font-bold">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: '🗺️',
              title: 'Carte Interactive',
              desc: 'Naviguez du pays à l\'école avec une cartographie en cascade. Filtrez par statut, milieu, niveau.',
            },
            {
              icon: '📊',
              title: 'Tableaux de Bord',
              desc: 'Visualisez les KPIs clés : parité filles/garçons, taux d\'alphabétisation, besoins en infrastructures.',
            },
            {
              icon: '📱',
              title: 'Collecte Terrain',
              desc: 'Formulaire intelligent hors-ligne pour collecter les données école par école, classe par classe.',
            },
          ].map((f) => (
            <div key={f.title} className="card">
              <span className="text-3xl">{f.icon}</span>
              <h3 className="text-sm font-black text-akwa-texte mt-3">{f.title}</h3>
              <p className="text-xs text-gray-500 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
