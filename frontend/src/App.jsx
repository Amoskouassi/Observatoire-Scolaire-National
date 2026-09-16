import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout/Layout';
import Home from './pages/Home/Home';
import Explorer from './pages/Explorer/Explorer';
import SchoolDetail from './pages/SchoolDetail/SchoolDetail';
import DashboardMairie from './pages/Dashboard/DashboardMairie';
import DashboardInstitution from './pages/Dashboard/DashboardInstitution';
import Collecte from './pages/Collecte/Collecte';
import Pricing from './pages/Pricing/Pricing';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import VerifyEmail from './pages/Auth/VerifyEmail';
import CodeLoginPage from './pages/Auth/CodeLoginPage';
import TwoFactorSetup from './pages/Auth/TwoFactorSetup';
import TwoFactorVerify from './pages/Auth/TwoFactorVerify';
import NotFound from './pages/NotFound/NotFound';
import ErrorBoundary from './components/ErrorBoundary';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuthStore();
  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F4EFE6]"><div className="w-10 h-10 rounded-full border-4 border-[#E8611A]/20 border-t-[#E8611A] animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const restoreSession = useAuthStore(s => s.restoreSession);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/explorer" element={<ErrorBoundary><Explorer /></ErrorBoundary>} />
          <Route path="/explorer/:level/:code" element={<ErrorBoundary><Explorer /></ErrorBoundary>} />
          <Route path="/ecole/:id" element={<SchoolDetail />} />

          <Route path="/espace-decideur" element={
            <ProtectedRoute allowedRoles={['mairie', 'institution', 'admin', 'president_region', 'ministre', 'directeur_afrique', 'partenaire', 'chercheur']}>
              <DashboardMairie />
            </ProtectedRoute>
          } />

          <Route path="/espace-institutions" element={
            <ProtectedRoute allowedRoles={['institution', 'admin']}>
              <DashboardInstitution />
            </ProtectedRoute>
          } />

          <Route path="/collecte" element={
            <ProtectedRoute allowedRoles={['enqueteur', 'admin']}>
              <Collecte />
            </ProtectedRoute>
          } />

          <Route path="/tarifs" element={<Pricing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/code-login" element={<CodeLoginPage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/verify-2fa" element={<TwoFactorVerify />} />
          <Route path="/setup-2fa" element={
            <ProtectedRoute>
              <TwoFactorSetup />
            </ProtectedRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
