import { Outlet, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Header from './Header';
import BottomNav from './BottomNav';

const Explorer = lazy(() => import('../../pages/Explorer/Explorer'));

export default function Layout() {
  const { pathname } = useLocation();
  const isExplorer = pathname === '/explorer' || pathname.startsWith('/explorer/');

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <main className="flex-1 overflow-auto pt-14 sm:pt-16 pb-14 sm:pb-16">
        <div className="h-full" style={{ display: isExplorer ? 'block' : 'none' }}>
          <Suspense fallback={<div className="h-full flex items-center justify-center bg-[#F4EFE6]"><div className="w-10 h-10 rounded-full border-4 border-[#E8611A]/20 border-t-[#E8611A] animate-spin" /></div>}>
            <Explorer />
          </Suspense>
        </div>
        <div className="h-full" style={{ display: isExplorer ? 'none' : 'block' }}>
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
