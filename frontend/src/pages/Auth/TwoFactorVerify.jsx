import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

export default function TwoFactorVerify() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  const partialToken = location.state?.partial_token;
  const emailMasked = location.state?.email_masked;

  if (!partialToken) {
    navigate('/login', { replace: true });
    return null;
  }

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setError('');
    setLoading(true);
    try {
      const res = await api.request('/2fa/validate', {
        method: 'POST',
        body: JSON.stringify({ partial_token: partialToken, code }),
      });
      login(res.user, res.token, res.session);
      navigate('/explorer');
    } catch (err) {
      setError(err.message || 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4EFE6] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-[#CBD5E1]/30 overflow-hidden">
          <div className="bg-[#0D1B2A] p-5 text-center">
            <span className="material-symbols-outlined text-[#E8611A] text-4xl mb-2">verified_user</span>
            <h1 className="text-white text-lg font-bold">Double authentification</h1>
            <p className="text-white/60 text-xs mt-1">Entrez le code de votre application d'authentification</p>
          </div>

          <div className="p-6">
            {emailMasked && (
              <p className="text-xs text-[#94A3B8] text-center mb-4">
                Compte : {emailMasked}
              </p>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full text-center text-3xl font-mono font-bold tracking-[0.5em] p-4 border border-[#CBD5E1] rounded-xl focus:border-[#E8611A] outline-none bg-[#FAF8F3]"
                autoFocus
              />
              {error && (
                <p className="text-xs text-[#ba1a1a] text-center">{error}</p>
              )}
              <button
                type="submit"
                disabled={code.length !== 6 || loading}
                className="w-full bg-[#E8611A] text-white font-bold py-3 rounded-xl disabled:opacity-40 transition-opacity"
              >
                {loading ? 'Vérification...' : 'Se connecter'}
              </button>
            </form>

            <button
              onClick={() => navigate('/login', { replace: true })}
              className="w-full mt-3 text-sm text-[#94A3B8] hover:text-[#475569] transition-colors"
            >
              Retour à la connexion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
