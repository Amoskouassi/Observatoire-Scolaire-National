import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import { signInWithGoogle } from '../../services/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.login(email, password);
      login(result.user, result.token, result.user.role);
      navigate('/explorer');
    } catch (err) {
      if (err.message?.includes('Email non confirmé')) {
        setNeedsVerification(true);
      } else {
        setError(err.message || 'Erreur');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) { setError(err.message); }
  };

  const handleResendCode = async () => {
    try {
      await api.resendCode(email);
      navigate('/verify-email', { state: { email } });
    } catch { navigate('/verify-email', { state: { email } }); }
  };

  const handleForgot = async () => {
    if (!email) { setError('Entrez votre email d\'abord'); return; }
    try {
      await api.forgotPassword(email);
      setForgotSent(true);
    } catch {
      setForgotSent(true);
    }
  };

  if (showForgot) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F4EFE6] px-4">
        <div className="kpi-card w-full max-w-md">
          <div className="text-center mb-6">
            <span className="text-4xl">🔑</span>
            <h1 className="text-lg font-bold text-[#0D1B2A] mt-2">Mot de passe oublié</h1>
            <p className="text-xs text-[#6B7280]">Un lien de réinitialisation sera envoyé par email</p>
          </div>
          {forgotSent ? (
            <div className="text-center space-y-4">
              <div className="bg-[#E8F5E9] border border-[#0B7A3E]/20 text-[#0B7A3E] text-xs p-3 rounded-lg">
                Si cet email est enregistré, vous recevrez un lien de réinitialisation.
              </div>
              <button onClick={() => { setShowForgot(false); setForgotSent(false); }}
                className="btn-primary w-full">Retour à la connexion</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#dee8ff]/60 border border-[#CBD5E1] rounded-lg p-2.5 text-sm focus:border-[#E8611A] outline-none" required />
              </div>
              {error && <div className="bg-[#ffdad6] border border-[#ba1a1a]/20 text-[#ba1a1a] text-xs p-3 rounded-lg">{error}</div>}
              <button onClick={handleForgot} className="btn-primary w-full" disabled={loading}>
                {loading ? 'Envoi...' : 'Envoyer le lien'}
              </button>
              <button onClick={() => setShowForgot(false)} className="btn-ghost w-full text-xs">Retour à la connexion</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (needsVerification) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F4EFE6] px-4">
        <div className="kpi-card w-full max-w-md text-center">
          <span className="text-5xl">📧</span>
          <h1 className="text-lg font-bold text-[#0D1B2A] mt-3">Email non confirmé</h1>
          <p className="text-xs text-[#6B7280] mt-2">
            Un code de confirmation a été envoyé à<br />
            <strong className="text-[#0D1B2A]">{email}</strong>
          </p>
          <button onClick={handleResendCode} className="btn-primary w-full mt-6">
            Confirmer mon email
          </button>
          <button onClick={() => { setNeedsVerification(false); setError(''); }}
            className="text-xs text-[#94A3B8] mt-4 hover:underline block mx-auto">
            Utiliser un autre email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center bg-[#F4EFE6] px-4">
      <div className="kpi-card w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-4xl">🇨🇮</span>
          <h1 className="text-lg font-bold text-[#0D1B2A] mt-2">Connexion</h1>
          <p className="text-xs text-[#6B7280]">Accédez à votre espace</p>
        </div>

        <button onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white border border-[#CBD5E1] rounded-lg p-2.5 text-sm font-bold text-[#0D1B2A] hover:bg-gray-50 transition-colors mb-4">
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continuer avec Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-[#CBD5E1]"></div>
          <span className="text-[10px] text-[#94A3B8] font-bold uppercase">ou</span>
          <div className="flex-1 h-px bg-[#CBD5E1]"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-[#ffdad6] border border-[#ba1a1a]/20 text-[#ba1a1a] text-xs p-3 rounded-lg">{error}</div>}
          <div>
            <label className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#dee8ff]/60 border border-[#CBD5E1] rounded-lg p-2.5 text-sm focus:border-[#E8611A] focus:ring-2 focus:ring-[#E8611A]/20 outline-none transition-colors" required />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-[#6B7280] uppercase">Mot de passe</label>
              <button type="button" onClick={() => setShowForgot(true)}
                className="text-[10px] text-[#E8611A] font-bold hover:underline">Mot de passe oublié ?</button>
            </div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#dee8ff]/60 border border-[#CBD5E1] rounded-lg p-2.5 text-sm focus:border-[#E8611A] focus:ring-2 focus:ring-[#E8611A]/20 outline-none transition-colors" required />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? 'Connexion...' : 'Connexion'}</button>
        </form>
        <p className="text-center text-xs text-[#6B7280] mt-4">Pas de compte ? <a href="/register" className="text-[#E8611A] underline font-bold">S'inscrire</a></p>
      </div>
    </div>
  );
}
