import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';

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
      if (result.requires_otp) {
        navigate('/verify-login-otp', {
          state: { temp_token: result.temp_token, email_masked: result.email_masked },
        });
        return;
      }
      if (result.requires_2fa) {
        navigate('/verify-2fa', { state: { partial_token: result.partial_token, email_masked: result.email_masked } });
        return;
      }
      login(result.user, result.token, result.session);
      navigate('/explorer');
    } catch (err) {
      if (err.message?.includes('Email non confirme')) {
        setNeedsVerification(true);
      } else {
        setError(err.message || 'Erreur');
      }
    } finally {
      setLoading(false);
    }
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
              <div className="bg-[#E8F5E9] border border-[#00796B]/20 text-[#00796B] text-xs p-3 rounded-lg">
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
        <p className="text-center text-xs text-[#6B7280] mt-4">Pas de compte ? <Link to="/register" className="text-[#E8611A] underline font-bold">S'inscrire</Link></p>
        <p className="text-center text-xs text-[#6B7280] mt-2">Enquêteur ? <Link to="/code-login" className="text-[#E8611A] underline font-bold">Connexion par code</Link></p>
      </div>
    </div>
  );
}
