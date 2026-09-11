import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../services/supabase';
import { api } from '../../services/api';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error || !data?.session) {
          navigate('/login');
          return;
        }

        const { token: backendToken, user } = await api.googleCallback(data.session.access_token);
        login(user, backendToken, user.role);
        navigate('/explorer');
      } catch {
        navigate('/login');
      }
    };

    handleCallback();
  }, [navigate, login]);

  return (
    <div className="h-full flex items-center justify-center bg-[#F4EFE6]">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-3 border-[#E8611A]/20 border-t-[#E8611A] animate-spin mx-auto" />
        <p className="text-xs text-[#6B7280] mt-3">Connexion en cours...</p>
      </div>
    </div>
  );
}
