import { Link } from 'react-router-dom';

export default function Pricing() {
  const plans = [
    {
      name: 'Carte Publique',
      price: 'Gratuit',
      desc: 'Accès libre à la carte interactive',
      features: [
        'Carte nationale interactive',
        'Données agrégées par zone',
        'Recherche par commune',
      ],
      cta: 'Accéder à la carte',
      href: '/explorer',
      popular: false,
    },
    {
      name: 'Espace Décideur',
      price: '2 500 000',
      period: '/an',
      desc: 'Dashboard dédié pour les Mairies',
      features: [
        'Dashboard personnalisé',
        'Export PDF/PNG des rapports',
        'Suivi de collecte en temps réel',
        'Affiches de plaidoyer générées',
        'Comparaison communes voisines',
        'Données détaillées par école',
      ],
      cta: 'Demander une démo',
      href: '/register',
      popular: true,
    },
    {
      name: 'Institutions & Bailleurs',
      price: 'Sur devis',
      desc: 'API, exports, études personnalisées',
      features: [
        'API complète',
        'Exports bruts (CSV, GeoJSON)',
        'Rapports d\'étude personnalisés',
        'Suivi de projets infrastructure',
        'Données historiques et tendances',
        'Support dédié',
      ],
      cta: 'Nous contacter',
      href: 'mailto:contact@observatoire-ci.com',
      popular: false,
    },
  ];

  return (
    <div className="h-full overflow-auto bg-surface">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-headline-lg-mobile text-ivoire-nuit font-black">Tarifs</h1>
          <p className="text-body-md text-ivoire-gris mt-2 max-w-xl mx-auto">
            L'accès public est gratuit pour tous les citoyens.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.name} className={`kpi-card relative ${plan.popular ? 'border-2 border-ivoire-orange shadow-halo' : ''}`}>
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 badge-orange text-[10px]">Populaire</span>
              )}
              <h3 className="text-label-sm text-ivoire-orange uppercase">{plan.name}</h3>
              <div className="mt-2">
                <span className="text-kpi-metric-mobile text-ivoire-nuit">{plan.price}</span>
                {plan.period && <span className="text-body-sm text-ivoire-gris">{plan.period}</span>}
              </div>
              <p className="text-body-sm text-ivoire-gris mt-1">{plan.desc}</p>
              <ul className="mt-3 space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-body-sm text-ivoire-texte">
                    <span className="text-ivoire-vert mt-0.5">✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link to={plan.href} className={`w-full mt-4 text-center block no-underline py-2.5 rounded-lg font-bold text-label-md transition-all active:scale-[0.98] ${
                plan.popular ? 'bg-ivoire-orange text-white shadow-halo' : 'bg-ivoire-beige text-ivoire-texte hover:bg-ivoire-frontiere/30'
              }`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
