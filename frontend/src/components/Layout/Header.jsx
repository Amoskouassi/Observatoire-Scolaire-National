import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export default function Header() {
  const { user, role, logout } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) setMobileMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user
    ? `${(user.prenom || user.email?.[0] || '').toUpperCase()[0] || ''}${(user.nom || '').toUpperCase()[0] || ''}`.slice(0, 2)
    : '';

  const handleLogout = () => {
    setMenuOpen(false);
    setMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  const roleLabels = {
    super_admin: 'Super Admin',
    admin: 'Administrateur',
    institution: 'Institution',
    president_region: 'Président de Région',
    decideur: 'Décideur',
    enqueteur: 'Enquêteur',
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-[#FAF8F3]/90 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
      <div className="h-14 sm:h-16 px-3 sm:px-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 sm:gap-2.5 no-underline">
          <span className="text-xl sm:text-2xl">🇨🇮</span>
          <div className="flex flex-col">
            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-[#E8611A] font-bold leading-none">BI Éducative CI</span>
            <h1 className="text-[11px] sm:text-xs font-bold text-[#0D1B2A] tracking-tight truncate max-w-[100px] sm:max-w-[130px]">Observatoire National</h1>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF8F3] shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#0B7A3E] animate-pulse" />
            <span className="text-[11px] font-bold text-[#0B7A3E]">En ligne</span>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 rounded-full bg-[#E8611A] flex items-center justify-center shrink-0 cursor-pointer hover:ring-2 hover:ring-[#E8611A]/30 transition-all"
            >
              {initials ? (
                <span className="text-white text-xs font-bold">{initials}</span>
              ) : (
                <span className="material-symbols-outlined text-white text-[18px]">person</span>
              )}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 w-64 bg-white rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden">
                {user && (
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-bold text-[#0D1B2A] truncate">{user.prenom} {user.nom}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    {role && (
                      <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#E8611A]/10 text-[#E8611A]">
                        {roleLabels[role] || role}
                      </span>
                    )}
                  </div>
                )}
                <div className="py-1">
                  <Link to="/espace-decideur" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#0D1B2A] hover:bg-gray-50 no-underline">
                    <span className="material-symbols-outlined text-[18px] text-gray-400">dashboard</span>
                    Mon tableau de bord
                  </Link>
                  <Link to="/collecte" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#0D1B2A] hover:bg-gray-50 no-underline">
                    <span className="material-symbols-outlined text-[18px] text-gray-400">edit_note</span>
                    Formulaire collecte
                  </Link>
                  <Link to="/explorer" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#0D1B2A] hover:bg-gray-50 no-underline sm:hidden">
                    <span className="material-symbols-outlined text-[18px] text-gray-400">map</span>
                    Explorer la carte
                  </Link>
                </div>
                <div className="border-t border-gray-100 py-1">
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 cursor-pointer">
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
