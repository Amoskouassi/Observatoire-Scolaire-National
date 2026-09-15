import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

export default function TwoFactorSetup() {
  const [step, setStep] = useState('loading');
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    setup2FA();
  }, []);

  const setup2FA = async () => {
    try {
      const res = await api.request('/2fa/setup', { method: 'POST' });
      setQrCode(res.qr_code);
      setSecret(res.secret);
      setStep('scan');
    } catch (err) {
      if (err.message?.includes('déjà activée')) {
        navigate('/explorer');
      } else {
        setError(err.message || 'Erreur lors de la configuration');
        setStep('error');
      }
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setError('');
    setLoading(true);
    try {
      await api.request('/2fa/verify', {
        method: 'POST',
        body: { code },
      });
      setStep('done');
      setTimeout(() => navigate('/explorer'), 1500);
    } catch (err) {
      setError(err.message || 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4EFE6]">
        <div className="w-10 h-10 rounded-full border-4 border-[#E8611A]/20 border-t-[#E8611A] animate-spin" />
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4EFE6]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#00796B] flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-white text-3xl">check</span>
          </div>
          <h2 className="text-lg font-bold text-[#0D1B2A]">2FA activée !</h2>
          <p className="text-sm text-[#6B7280] mt-1">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4EFE6] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-[#CBD5E1]/30 overflow-hidden">
          <div className="bg-[#E8611A] p-5 text-center">
            <span className="material-symbols-outlined text-white text-4xl mb-2">security</span>
            <h1 className="text-white text-lg font-bold">Activation de la double authentification</h1>
            <p className="text-white/80 text-xs mt-1">Sécurisez votre compte avec un code de vérification</p>
          </div>

          <div className="p-6">
            {step === 'scan' && (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-[#475569] font-medium mb-3">
                    1. Scannez ce QR code avec votre application d'authentification
                  </p>
                  <div className="flex justify-center">
                    <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48 rounded-xl border border-[#CBD5E1]" />
                  </div>
                </div>

                <div className="bg-[#F4EFE6] rounded-xl p-3">
                  <p className="text-[10px] text-[#94A3B8] uppercase font-bold mb-1">Ou entrez ce code manuellement :</p>
                  <p className="text-sm font-mono font-bold text-[#0D1B2A] break-all select-all">{secret}</p>
                </div>

                <div className="border-t border-[#CBD5E1]/30 pt-4">
                  <p className="text-sm text-[#475569] font-medium mb-3">
                    2. Entrez le code à 6 chiffres affiché dans l'application
                  </p>
                  <form onSubmit={handleVerify} className="space-y-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full text-center text-2xl font-mono font-bold tracking-[0.5em] p-3 border border-[#CBD5E1] rounded-xl focus:border-[#E8611A] outline-none bg-[#FAF8F3]"
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
                      {loading ? 'Vérification...' : 'Activer la 2FA'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {step === 'error' && (
              <div className="text-center">
                <p className="text-sm text-[#ba1a1a]">{error}</p>
                <button onClick={setup2FA} className="mt-4 text-sm text-[#E8611A] font-bold">Réessayer</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
