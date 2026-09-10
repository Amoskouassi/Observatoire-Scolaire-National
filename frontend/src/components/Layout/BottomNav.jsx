import { Link, useLocation } from 'react-router-dom';

const NAV = [
  { path: '/explorer', icon: 'map', label: 'Explorer' },
  { path: '/ecole/demo', icon: 'school', label: 'Fiche École' },
  { path: '/espace-decideur', icon: 'bar_chart', label: 'Décideurs' },
  { path: '/collecte', icon: 'edit_location', label: 'Collecte' },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 w-full z-50 bg-[#FAF8F3]/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="flex justify-around items-center h-16 px-2">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.path);
          return (
            <Link key={item.path} to={item.path}
              className={`flex flex-col items-center justify-center min-w-[64px] min-h-[44px] no-underline transition-colors ${active ? 'text-[#E8611A] font-bold' : 'text-[#6B7280]'}`}>
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              <span className="text-[10px] mt-0.5 tracking-tight font-bold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
