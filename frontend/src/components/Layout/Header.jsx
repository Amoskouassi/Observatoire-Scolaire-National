import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export default function Header() {
  const { user, role, logout } = useAuthStore();
  const location = useLocation();

  return (
    <header className="bg-white border-b border-akwa-frontiere px-4 py-3 shadow-sm flex justify-between items-center z-50">
      <Link to="/" className="flex items-center gap-3 no-underline">
        <span className="text-2xl">🇨🇮</span>
        <div>
          <h1 className="text-sm font-black tracking-widest uppercase text-akwa-texte">
            Observatoire Scolaire National
          </h1>
          <p className="text-[11px] text-gray-500 font-semibold" id="breadcrumb">
            République de Côte d'Ivoire
          </p>
        </div>
      </Link>

      <nav className="hidden md:flex items-center gap-1">
        <NavLink to="/explorer" active={location.pathname.startsWith('/explorer')}>
          🗺️ Explorer
        </NavLink>
        {role && ['mairie', 'institution', 'admin'].includes(role) && (
          <NavLink to="/espace-decideur" active={location.pathname.startsWith('/espace-decideur')}>
            📊 Décideur
          </NavLink>
        )}
        {role && ['institution', 'admin'].includes(role) && (
          <NavLink to="/espace-institutions" active={location.pathname.startsWith('/espace-institutions')}>
            🌍 Institutions
          </NavLink>
        )}
        <NavLink to="/tarifs" active={location.pathname === '/tarifs'}>
          💼 Tarifs
        </NavLink>
      </nav>

      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-2">
            <span className="badge-orange hidden sm:inline-flex">
              {role === 'admin' ? '👑 Admin' : role === 'mairie' ? '🏛️ Mairie' : role === 'institution' ? '🌍 Institution' : '📱 Enquêteur'}
            </span>
            <button onClick={logout} className="btn-ghost text-[11px]">
              Déconnexion
            </button>
          </div>
        ) : (
          <Link to="/login" className="btn-primary text-[11px] py-2 px-4 no-underline">
            Connexion
          </Link>
        )}
      </div>
    </header>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 text-xs font-bold rounded-button transition-colors no-underline ${
        active
          ? 'bg-akwa-orange/10 text-akwa-orange'
          : 'text-akwa-gris hover:bg-gray-100 hover:text-akwa-texte'
      }`}
    >
      {children}
    </Link>
  );
}
