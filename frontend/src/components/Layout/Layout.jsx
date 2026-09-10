import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <div className="h-screen flex flex-col bg-surface">
      <Header />
      <main className="flex-1 overflow-auto pt-safe pb-safe">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
