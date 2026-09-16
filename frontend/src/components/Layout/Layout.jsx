import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <div className="h-screen flex flex-col">
      <Header />
      <main className="flex-1 overflow-auto pt-14 sm:pt-16 pb-14 sm:pb-16">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
