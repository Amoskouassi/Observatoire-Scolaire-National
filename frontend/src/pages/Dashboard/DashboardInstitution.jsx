export default function DashboardInstitution() {
  return (
    <div className="h-full overflow-auto bg-[#F4EFE6]">
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-5">
        <h1 className="text-lg font-bold text-[#0D1B2A]">Espace Institutions</h1>
        <div className="grid grid-cols-3 gap-3">
          {[{ icon: 'folder', label: 'Projets', val: '—' }, { icon: 'school', label: 'Écoles', val: '—' }, { icon: 'bar_chart', label: 'Exports', val: '—' }].map((k) => (
            <div key={k.label} className="kpi-card text-center">
              <span className="material-symbols-outlined text-[#E8611A] text-[20px]">{k.icon}</span>
              <p className="text-[1.875rem] font-black text-[#0D1B2A] mt-1">{k.val}</p>
              <p className="text-xs text-[#6B7280]">{k.label}</p>
            </div>
          ))}
        </div>
        <div className="bg-[#FAF8F3] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <h3 className="text-sm font-bold text-[#0D1B2A] mb-2">Mes dossiers</h3>
          <p className="text-xs text-[#6B7280]">Créez et suivez vos dossiers d'étude.</p>
          <button className="btn-secondary mt-3 text-sm">+ Nouveau dossier</button>
        </div>
        <div className="bg-[#FAF8F3] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <h3 className="text-sm font-bold text-[#0D1B2A] mb-2">Exports</h3>
          <div className="flex gap-2 mt-3">
            <button className="btn-ghost border border-[#CBD5E1] text-sm">📥 CSV</button>
            <button className="btn-ghost border border-[#CBD5E1] text-sm">📥 GeoJSON</button>
          </div>
        </div>
      </div>
    </div>
  );
}
