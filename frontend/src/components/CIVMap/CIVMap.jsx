export default function CIVMap() {
  return (
    <div className="relative w-full h-full bg-ivoire-nuit overflow-hidden flex items-center justify-center">
      {/* Grille en filigrane */}
      <div className="absolute inset-0 opacity-15 pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(#CBD5E1 0.75px, transparent 0.75px)', backgroundSize: '20px 20px' }} />

      {/* SVG Carte CI stylisée */}
      <svg className="w-full h-full max-w-md select-none" viewBox="0 0 400 380">
        <defs>
          <linearGradient id="mapGrad" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#16293D" />
            <stop offset="100%" stopColor="#09131D" />
          </linearGradient>
          <filter id="glow-orange" height="140%" width="140%" x="-20%" y="-20%">
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="3" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Frontières CI */}
        <path d="M130 50 L270 50 L320 110 L350 190 L330 300 L280 340 L160 330 L90 280 L70 190 L100 110 Z"
              fill="url(#mapGrad)" stroke="#1E3A5F" strokeDasharray="3 3" strokeWidth="1.5" />

        {/* Tracés intérieurs */}
        <path d="M130 110 L270 120 M200 50 L200 200 M110 200 L290 200 M180 200 L160 330 M220 200 L280 340"
              fill="none" stroke="#16293D" strokeWidth="1.5" />

        {/* District Savanes - Sélectionné */}
        <g className="cursor-pointer">
          <circle className="animate-ping" cx="200" cy="85" fill="#E8611A" fillOpacity="0.15" r="22" />
          <circle cx="200" cy="85" fill="#E8611A" fillOpacity="0.3" filter="url(#glow-orange)" r="14" />
          <circle cx="200" cy="85" fill="#E8611A" r="7" stroke="#FAF8F3" strokeWidth="2" />
          <rect fill="#FAF8F3" height="24" rx="12" width="110" x="145" y="44" />
          <text fill="#0D1B2A" fontFamily="Inter" fontSize="9" fontWeight="700" textAnchor="middle" x="200" y="60">SAVANES • 100%</text>
        </g>

        {/* Abidjan */}
        <g className="cursor-pointer">
          <circle className="animate-pulse" cx="295" cy="285" fill="#E8611A" fillOpacity="0.2" r="18" />
          <circle cx="295" cy="285" fill="#E8611A" r="8" stroke="#FAF8F3" strokeWidth="2" />
          <rect fill="#FAF8F3" height="20" rx="10" width="80" x="255" y="298" />
          <text fill="#0D1B2A" fontFamily="Inter" fontSize="8.5" fontWeight="700" textAnchor="middle" x="295" y="312">ABIDJAN</text>
        </g>

        {/* Zanzan */}
        <g className="cursor-pointer">
          <circle cx="315" cy="160" fill="#0B7A3E" fillOpacity="0.25" r="12" />
          <circle cx="315" cy="160" fill="#0B7A3E" r="6" stroke="#FAF8F3" strokeWidth="1.5" />
          <rect fill="#0D1B2A" fillOpacity="0.9" height="18" rx="9" width="70" x="280" y="132" />
          <text fill="#96f7ad" fontFamily="Inter" fontSize="8" fontWeight="600" textAnchor="middle" x="315" y="145">Zanzan 74%</text>
        </g>

        {/* Bouaké */}
        <g className="cursor-pointer">
          <circle cx="200" cy="165" fill="#0B7A3E" r="6" stroke="#FAF8F3" strokeWidth="1.5" />
          <rect fill="#0D1B2A" fillOpacity="0.85" height="16" rx="8" width="60" x="170" y="174" />
          <text fill="#FAF8F3" fontFamily="Inter" fontSize="7.5" fontWeight="600" textAnchor="middle" x="200" y="186">Bouaké</text>
        </g>

        {/* San-Pédro */}
        <g className="cursor-pointer">
          <circle cx="130" cy="290" fill="#6B7280" r="5" stroke="#FAF8F3" strokeWidth="1.5" />
          <text fill="#CBD5E1" fontFamily="Inter" fontSize="8" fontWeight="500" textAnchor="middle" x="130" y="308">San-Pédro</text>
        </g>

        {/* Man */}
        <g className="cursor-pointer">
          <circle cx="95" cy="205" fill="#6B7280" r="5" stroke="#FAF8F3" strokeWidth="1.5" />
          <text fill="#CBD5E1" fontFamily="Inter" fontSize="8" fontWeight="500" textAnchor="middle" x="95" y="222">Man</text>
        </g>

        {/* Daloa */}
        <g className="cursor-pointer">
          <circle cx="155" cy="210" fill="#0B7A3E" r="5" stroke="#FAF8F3" strokeWidth="1.5" />
        </g>
      </svg>

      {/* Contrôles zoom */}
      <div className="absolute right-3 top-3 flex flex-col gap-1.5 z-10">
        <button className="w-8 h-8 rounded-lg bg-ivoire-nuit/85 backdrop-blur text-ivoire-blanc flex items-center justify-center shadow-lg active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-[18px]">add</span>
        </button>
        <button className="w-8 h-8 rounded-lg bg-ivoire-nuit/85 backdrop-blur text-ivoire-blanc flex items-center justify-center shadow-lg active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-[18px]">remove</span>
        </button>
        <button className="w-8 h-8 rounded-lg bg-ivoire-nuit/85 backdrop-blur text-ivoire-orange flex items-center justify-center shadow-lg active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-[18px]">my_location</span>
        </button>
      </div>

      {/* Légende */}
      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between px-3 py-1.5 rounded-lg bg-ivoire-nuit/90 backdrop-blur text-ivoire-blanc text-label-sm text-[10px] shadow-md pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-ivoire-orange" />
          <span>Collecté</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-ivoire-vert" />
          <span>En cours</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-ivoire-gris" />
          <span>En attente</span>
        </div>
        <span className="text-[9px] text-ivoire-orange font-bold uppercase tracking-wider">SIG v2.4</span>
      </div>
    </div>
  );
}
