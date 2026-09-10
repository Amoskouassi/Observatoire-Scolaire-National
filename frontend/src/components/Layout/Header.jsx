import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export default function Header() {
  const { user, role } = useAuthStore();

  return (
    <header className="fixed top-0 w-full z-50 pt-safe bg-ivoire-blanc/90 backdrop-blur-xl shadow-card">
      <div className="h-16 px-4 flex items-center justify-between gap-2">
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <span className="text-2xl">🇨🇮</span>
          <div className="flex flex-col">
            <span className="text-[10px] text-label-sm uppercase tracking-wider text-ivoire-orange font-bold leading-none">
              BI Éducative CI
            </span>
            <h1 className="text-xs font-bold text-ivoire-nuit tracking-tight truncate max-w-[130px]">
              Observatoire National
            </h1>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ivoire-blanc shadow-sm">
            <span className="w-2 h-2 rounded-full bg-ivoire-vert animate-pulse-dot" />
            <span className="text-[11px] font-bold text-ivoire-vert">En ligne</span>
          </div>
          {user ? (
            <div className="w-8 h-8 rounded-full bg-ivoire-orange flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white text-[18px]">person</span>
            </div>
          ) : (
            <Link to="/login" className="w-8 h-8 rounded-full bg-ivoire-gris/20 flex items-center justify-center shrink-0 no-underline">
              <span className="material-symbols-outlined text-ivoire-gris text-[18px]">person_outline</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
