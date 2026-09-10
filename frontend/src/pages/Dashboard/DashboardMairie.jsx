export default function DashboardMairie() {
  return (
    <div className="h-full overflow-auto bg-[#F4EFE6]">
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-5">
        <div className="bg-[#FAF8F3] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="material-symbols-outlined text-[#E8611A] text-[18px]">location_city</span>
            <span className="text-xs font-bold text-[#E8611A] uppercase tracking-wider">Mairie & District des Savanes</span>
          </div>
          <h2 className="text-lg font-bold text-[#0D1B2A]">Mairie de Korhogo</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#dee8ff]/60 text-xs text-[#1E293B] font-semibold">
              <span className="material-symbols-outlined text-[15px] text-[#6B7280]">calendar_today</span> Année 2023-2024
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F4EFE6] text-xs text-[#6B7280]">
              <span className="material-symbols-outlined text-[15px] text-[#0B7A3E]">verified_user</span> Audit Validé
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: 'school', label: 'Écoles', value: '142', badge: '100%', badgeBg: '#0B7A3E' },
            { icon: 'groups', label: 'Classes >50élèves', value: '38%', badge: 'Alerte', badgeBg: '#E8611A' },
            { icon: 'water_drop', label: 'Sans eau', value: '54', badge: 'Urgence', badgeBg: '#ba1a1a', error: true },
            { icon: 'account_balance_wallet', label: 'Budget', value: '320M', badge: 'FCFA', badgeBg: '#0B7A3E' },
          ].map((k) => (
            <div key={k.label} className={`p-3.5 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] ${k.error ? 'bg-[#ffdad6]/40' : 'bg-[#FAF8F3]'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`p-1.5 rounded-lg ${k.error ? 'bg-[#ffdad6] text-[#ba1a1a]' : 'bg-[#e7eeff] text-[#0D1B2A]'}`}>
                  <span className="material-symbols-outlined text-[20px]">{k.icon}</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${k.badgeBg}15`, color: k.badgeBg }}>{k.badge}</span>
              </div>
              <p className="text-xs text-[#6B7280]">{k.label}</p>
              <p className={`text-[1.875rem] font-black tabular-nums ${k.error ? 'text-[#ba1a1a]' : 'text-[#0D1B2A]'}`}>{k.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#FAF8F3] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <h3 className="text-sm font-bold text-[#0D1B2A] mb-3">Verdict IA</h3>
          <div className="bg-[#F4EFE6] rounded-lg p-3 text-xs text-[#1E293B] leading-relaxed">
            <strong>Urgence :</strong> 14 écoles du <span className="text-[#E8611A] font-bold">secteur Nord-Est</span> nécessitent une intervention prioritaire. Réfection des forages et <span className="font-bold text-[#0B7A3E]">1 200 tables-bancs</span>.
          </div>
          <div className="flex items-center justify-between text-xs text-[#6B7280] mt-2">
            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[15px] text-[#0B7A3E]">verified</span> Confiance: 94.2%</span>
            <span className="text-[#E8611A] font-bold">Arbitrage immédiat</span>
          </div>
        </div>

        <div className="bg-[#FAF8F3] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <h3 className="text-sm font-bold text-[#0D1B2A] mb-3">Besoins</h3>
          {[
            { label: 'Tables-bancs', pct: 42, color: '#E8611A' },
            { label: 'Latrines VIP', pct: 28, color: '#0B7A3E' },
            { label: 'Toitures', pct: 18, color: '#4B5563' },
            { label: 'Solaire', pct: 12, color: '#d97706' },
          ].map((b) => (
            <div key={b.label} className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-[#1E293B]">{b.label}</span>
                <span className="font-bold" style={{ color: b.color }}>{b.pct}%</span>
              </div>
              <div className="w-full h-2.5 bg-[#dee8ff] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${b.pct}%`, backgroundColor: b.color }} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2.5 pb-4">
          <button className="btn-secondary w-full flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[20px]">description</span> Exporter le rapport
          </button>
          <button className="btn-primary w-full flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[20px]">calculate</span> Simuler une dotation
          </button>
        </div>
      </div>
    </div>
  );
}
