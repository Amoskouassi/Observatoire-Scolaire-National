import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="h-full overflow-auto bg-[#F4EFE6]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <span className="text-5xl">🇨🇮</span>
          <h1 className="text-[1.5rem] leading-[1.25] tracking-tight text-[#0D1B2A] mt-3 font-black">Observatoire Scolaire National</h1>
          <p className="text-[#6B7280] mt-2 max-w-xl mx-auto text-sm">Cartographie interactive des établissements scolaires de Côte d'Ivoire.</p>
          <div className="flex justify-center gap-3 mt-5">
            <Link to="/explorer" className="btn-primary no-underline inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">map</span> Explorer la Carte
            </Link>
            <Link to="/tarifs" className="btn-ghost no-underline border border-[#CBD5E1]">Voir les Tarifs</Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {[
            { value: '34', label: 'Districts', icon: 'map' },
            { value: '31', label: 'Régions', icon: 'public' },
            { value: '82', label: 'Départements', icon: 'location_on' },
            { value: '~2 500', label: 'Communes', icon: 'location_city' },
          ].map((s) => (
            <div key={s.label} className="kpi-card">
              <span className="material-symbols-outlined text-[#E8611A] text-[20px]">{s.icon}</span>
              <p className="text-[1.875rem] leading-[1.1] tracking-tight text-[#0D1B2A] mt-1 font-black tabular-nums">{s.value}</p>
              <p className="text-xs font-bold text-[#6B7280]">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: 'map', title: 'Carte Interactive', desc: "Naviguez du pays à l'école avec une cartographie en cascade." },
            { icon: 'bar_chart', title: 'Tableaux de Bord', desc: 'KPIs : parité, alphabétisation, besoins en infrastructures.' },
            { icon: 'edit_location', title: 'Collecte Terrain', desc: 'Formulaire intelligent hors-ligne, classe par classe.' },
          ].map((f) => (
            <div key={f.title} className="kpi-card">
              <span className="material-symbols-outlined text-[#E8611A] text-[24px]">{f.icon}</span>
              <h3 className="text-sm font-bold text-[#0D1B2A] mt-2">{f.title}</h3>
              <p className="text-xs text-[#6B7280] mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
