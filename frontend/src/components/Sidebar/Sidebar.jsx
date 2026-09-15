import { useEffect } from 'react';
import { useMapStore } from '../../stores/mapStore';
import SidebarContent from './SidebarContent';

export default function Sidebar() {
  const { sidebarOpen, sidebarContent, closeSidebar } = useMapStore();

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') closeSidebar();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [closeSidebar]);

  return (
    <aside
      className={`sidebar-transition w-0 h-full bg-white flex flex-col overflow-y-auto z-10 border-r border-[#CBD5E1] ${
        sidebarOpen ? 'w-full sm:w-[360px]' : 'w-0'
      }`}
    >
      <div
        id="sidebarContent"
        className={`p-4 sm:p-6 flex-col h-full transition-opacity duration-300 ${
          sidebarOpen ? 'flex opacity-100' : 'hidden opacity-0'
        }`}
      >
        <button
          onClick={closeSidebar}
          className="mb-5 text-[#E8611A] hover:text-[#0D1B2A] flex items-center font-bold text-xs uppercase tracking-wider cursor-pointer transition gap-1"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
        <SidebarContent content={sidebarContent} />
      </div>
    </aside>
  );
}
