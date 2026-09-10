import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="fixed top-0 w-full z-50 bg-[#FAF8F3]/90 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
      <div className="h-16 px-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <span className="text-2xl">🇨🇮</span>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[#E8611A] font-bold leading-none">BI Éducative CI</span>
            <h1 className="text-xs font-bold text-[#0D1B2A] tracking-tight truncate max-w-[130px]">Observatoire National</h1>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF8F3] shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#0B7A3E] animate-pulse" />
            <span className="text-[11px] font-bold text-[#0B7A3E]">En ligne</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#E8611A] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white text-[18px]">person</span>
          </div>
        </div>
      </div>
    </header>
  );
}
