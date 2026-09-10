import { Link } from 'react-router-dom';

export default function Pricing() {
  return (
    <div className="h-full overflow-auto bg-[#F4EFE6]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-[1.5rem] font-black text-[#0D1B2A] text-center">Tarifs</h1>
        <p className="text-sm text-[#6B7280] text-center mt-2">L'accès public est gratuit.</p>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {[
            { name: 'Carte Publique', price: 'Gratuit', features: ['Carte interactive', 'Données agrégées', 'Recherche commune'], popular: false },
            { name: 'Espace Décideur', price: '2.5M', period: '/an', features: ['Dashboard dédié', 'Export PDF', 'Suivi collecte', 'Affiches plaidoyer', 'Comparaison communes'], popular: true },
            { name: 'Institutions', price: 'Sur devis', features: ['API complète', 'Exports CSV/GeoJSON', 'Rapports études', 'Support dédié'], popular: false },
          ].map((p) => (
            <div key={p.name} className={`kpi-card relative ${p.popular ? 'border-2 border-[#E8611A] shadow-[0_0_20px_rgba(232,97,26,0.35)]' : ''}`}>
              {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 badge-orange text-[10px]">Populaire</span>}
              <h3 className="text-xs font-bold text-[#E8611A] uppercase">{p.name}</h3>
              <div className="mt-2"><span className="text-[1.875rem] font-black text-[#0D1B2A]">{p.price}</span>{p.period && <span className="text-xs text-[#6B7280]">{p.period}</span>}</div>
              <ul className="mt-3 space-y-1.5">
                {p.features.map((f) => <li key={f} className="flex items-start gap-2 text-xs text-[#1E293B]"><span className="text-[#0B7A3E]">✓</span>{f}</li>)}
              </ul>
              <Link to="/register" className={`w-full mt-4 text-center block no-underline py-2.5 rounded-lg font-bold text-sm transition-all active:scale-[0.98] ${p.popular ? 'bg-[#E8611A] text-white' : 'bg-[#F4EFE6] text-[#1E293B] hover:bg-[#CBD5E1]/30'}`}>
                {p.popular ? 'Demander une démo' : 'Choisir'}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
