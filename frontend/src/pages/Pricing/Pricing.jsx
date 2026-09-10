export default function Pricing() {
  const plans = [
    {
      name: 'Carte Publique',
      price: 'Gratuit',
      period: '',
      desc: 'Accès libre à la carte interactive',
      features: [
        'Carte nationale interactive',
        'Données agrégées par zone',
        'Recherche par commune',
        'Pas de dashboard dédié',
      ],
      cta: 'Accéder à la carte',
      href: '/explorer',
      color: 'akwa-gris',
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
        'Comparaison avec les communes voisines',
        'Données détaillées par école',
      ],
      cta: 'Demander une démo',
      href: '/register',
      color: 'akwa-orange',
      popular: true,
    },
    {
      name: 'Institutions & Bailleurs',
      price: 'Sur devis',
      period: '',
      desc: 'API, exports, études personnalisées',
      features: [
        'API complète (accès programmatique)',
        'Exports bruts (CSV, GeoJSON)',
        'Rapports d\'étude personnalisés',
        'Suivi de projets d\'infrastructure',
        'Données historiques et tendances',
        'Support dédié',
      ],
      cta: 'Nous contacter',
      href: 'mailto:contact@observatoire-ci.com',
      color: 'akwa-vert',
    },
  ];

  return (
    <div className="h-full overflow-auto bg-akwa-beige">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-akwa-texte">Tarifs</h1>
          <p className="text-akwa-gris mt-2 max-w-xl mx-auto">
            Choisissez le plan adapté à votre besoin. L'accès public est gratuit pour tous les citoyens.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.name} className={`card relative ${plan.popular ? 'border-2 border-akwa-orange shadow-haloOrange' : ''}`}>
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 badge-orange text-[10px]">⭐ Populaire</span>
              )}

              <h3 className={`text-sm font-black ${plan.color} uppercase`}>{plan.name}</h3>
              <div className="mt-3">
                <span className="text-2xl font-black text-akwa-texte">{plan.price}</span>
                {plan.period && <span className="text-xs text-gray-500">{plan.period}</span>}
              </div>
              <p className="text-xs text-gray-500 mt-1">{plan.desc}</p>

              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-akwa-texte">
                    <span className="text-akwa-vert mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <a href={plan.href} className={`btn-primary w-full mt-6 text-center block no-underline ${plan.popular ? '' : 'btn-ghost border border-akwa-frontiere'}`}>
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <p className="text-xs text-gray-500">
            💳 Paiements Mobile Money acceptés (Orange Money, MTN MoMo, Wave)
          </p>
        </div>
      </div>
    </div>
  );
}
