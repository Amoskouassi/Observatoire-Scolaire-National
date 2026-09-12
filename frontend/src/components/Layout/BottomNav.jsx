import { Link, useLocation } from 'react-router-dom';

const NAV = [
  { path: '/explorer', icon: 'map', label: 'Carte' },
  { path: '/espace-decideur', icon: 'bar_chart', label: 'Décideurs' },
  { path: '/collecte', icon: 'edit_location', label: 'Collecte' },
  { path: '/ecole/demo', icon: 'school', label: 'École' },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 w-full z-50 bg-[#FAF8F3]/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="flex justify-around items-center h-14 sm:h-16 px-1 sm:px-2 max-w-lg mx-auto">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.path);
          return (
            <Link key={item.path} to={item.path}
              className={`flex flex-col items-center justify-center min-w-[56px] sm:min-w-[64px] min-h-[44px] no-underline transition-colors rounded-xl ${active ? 'text-[#E8611A] font-bold bg-[#E8611A]/5' : 'text-[#6B7280]'}`}>
              <span className="material-symbols-outlined text-[20px] sm:text-[22px]">{item.icon}</span>
              <span className="text-[9px] sm:text-[10px] mt-0.5 tracking-tight font-bold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
