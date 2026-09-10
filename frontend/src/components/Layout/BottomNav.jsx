import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/explorer', icon: 'map', label: 'Explorer' },
  { path: '/ecole/demo', icon: 'school', label: 'Fiche École' },
  { path: '/espace-decideur', icon: 'bar_chart', label: 'Décideurs' },
  { path: '/collecte', icon: 'edit_location', label: 'Collecte' },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 w-full z-50 pb-safe bg-ivoire-blanc/95 backdrop-blur-xl shadow-nav">
      <div className="flex justify-around items-center h-16 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center min-w-[64px] min-h-[44px] transition-colors no-underline ${
                isActive ? 'text-ivoire-orange font-bold' : 'text-ivoire-gris'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              <span className="text-[10px] mt-0.5 tracking-tight font-bold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
