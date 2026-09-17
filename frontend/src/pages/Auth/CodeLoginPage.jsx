import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';

export default function CodeLoginPage() {
  const [step, setStep] = useState('code');
  const [loginCode, setLoginCode] = useState('');
  const [otp, setOtp] = useState('');
  const [emailMasked, setEmailMasked] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.codeLogin(loginCode);
      setEmailMasked(result.email_masked);
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.verifyLoginCode(loginCode, otp);
      if (result.requires_2fa) {
        navigate('/verify-2fa', { state: { partial_token: result.partial_token, email_masked: result.email_masked } });
        return;
      }
      login(result.user, result.token, result.session);
      navigate('/explorer');
    } catch (err) {
      setError(err.message || 'Code OTP invalide');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('code');
    setOtp('');
    setError('');
  };

  return (
    <div className="h-full flex items-center justify-center bg-[#F4EFE6] px-4">
      <div className="kpi-card w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-4xl">🔑</span>
          <h1 className="text-lg font-bold text-[#0D1B2A] mt-2">
            {step === 'code' ? 'Connexion par code' : 'Vérification'}
          </h1>
          <p className="text-xs text-[#6B7280]">
            {step === 'code'
              ? 'Entrez votre code enquêteur'
              : `Un code a été envoyé à ${emailMasked}`}
          </p>
        </div>

        {step === 'code' ? (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            {error && <div className="bg-[#ffdad6] border border-[#ba1a1a]/20 text-[#ba1a1a] text-xs p-3 rounded-lg">{error}</div>}
            <div>
              <label className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Code enquêteur</label>
              <input
                type="text"
                value={loginCode}
                onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                placeholder="ENQ-XXXX"
                className="w-full bg-[#dee8ff]/60 border border-[#CBD5E1] rounded-lg p-2.5 text-sm font-mono tracking-widest text-center focus:border-[#E8611A] focus:ring-2 focus:ring-[#E8611A]/20 outline-none transition-colors"
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Vérification...' : 'Continuer'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            {error && <div className="bg-[#ffdad6] border border-[#ba1a1a]/20 text-[#ba1a1a] text-xs p-3 rounded-lg">{error}</div>}
            <div>
              <label className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Code OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                className="w-full bg-[#dee8ff]/60 border border-[#CBD5E1] rounded-lg p-2.5 text-sm font-mono tracking-widest text-center text-lg focus:border-[#E8611A] focus:ring-2 focus:ring-[#E8611A]/20 outline-none transition-colors"
                required
                autoFocus
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading || otp.length !== 6}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
            <button type="button" onClick={handleBack} className="btn-ghost w-full text-xs">
              Utiliser un autre code
            </button>
          </form>
        )}

        <p className="text-center text-xs text-[#6B7280] mt-4">
          <Link to="/login" className="text-[#E8611A] underline font-bold">Connexion classique</Link>
        </p>
      </div>
    </div>
  );
}
