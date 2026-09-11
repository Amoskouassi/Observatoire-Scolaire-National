import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import { signInWithGoogle } from '../../services/supabase';

export default function Register() {
  const [step, setStep] = useState('form');
  const [form, setForm] = useState({ email: '', password: '', nom: '', prenom: '', role: 'enqueteur' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [verifyError, setVerifyError] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { login } = useAuthStore();
  const u = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.register(form);
      setStep('verify');
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) { setError(err.message); }
  };

  const handleCodeChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) {
      const next = document.querySelector(`input[data-index="${index + 1}"]`);
      if (next) next.focus();
    }
    if (newCode.every(c => c !== '')) {
      handleVerify(newCode.join(''));
    }
  };

  const handleCodePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split('');
      setCode(newCode);
      handleVerify(pasted);
    }
  };

  const handleVerify = async (codeStr) => {
    setVerifyError('');
    setVerifyLoading(true);
    try {
      const { token, user } = await api.verifyCode(form.email, codeStr);
      login(user, token, user.role);
      window.location.href = '/explorer';
    } catch (err) { setVerifyError(err.message); } finally { setVerifyLoading(false); }
  };

  const handleResend = async () => {
    try {
      await api.resendCode(form.email);
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown(prev => { if (prev <= 1) { clearInterval(interval); return 0; } return prev - 1; });
      }, 1000);
    } catch {}
  };

  if (step === 'verify') {
    return (
      <div className="h-full flex items-center justify-center bg-[#F4EFE6] px-4">
        <div className="kpi-card w-full max-w-md text-center">
          <span className="text-5xl">📧</span>
          <h1 className="text-lg font-bold text-[#0D1B2A] mt-3">Vérifiez votre email</h1>
          <p className="text-xs text-[#6B7280] mt-2">
            Un code à 6 chiffres a été envoyé à<br />
            <strong className="text-[#0D1B2A]">{form.email}</strong>
          </p>

          <div className="flex justify-center gap-2.5 mt-6" onPaste={handleCodePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                data-index={i}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(i, e.target.value)}
                className="w-11 h-13 text-center text-xl font-bold bg-[#dee8ff]/60 border border-[#CBD5E1] rounded-lg focus:border-[#E8611A] focus:ring-2 focus:ring-[#E8611A]/20 outline-none transition-colors"
                disabled={verifyLoading}
              />
            ))}
          </div>

          {verifyError && (
            <div className="bg-[#ffdad6] text-[#ba1a1a] text-xs p-3 rounded-lg mt-4">{verifyError}</div>
          )}

          {verifyLoading && (
            <p className="text-xs text-[#6B7280] mt-4 animate-pulse">Vérification en cours...</p>
          )}

          <div className="mt-6">
            {resendCooldown > 0 ? (
              <p className="text-xs text-[#94A3B8]">Renvoyer dans {resendCooldown}s</p>
            ) : (
              <button onClick={handleResend} className="text-xs text-[#E8611A] font-bold hover:underline">
                Renvoyer le code
              </button>
            )}
          </div>

          <button onClick={() => { setStep('form'); setCode(['','','','','','']); setVerifyError(''); }}
            className="text-xs text-[#94A3B8] mt-4 hover:underline block mx-auto">
            Modifier l'adresse email
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
          <h1 className="text-lg font-bold text-[#0D1B2A] mt-2">Inscription</h1>
        </div>

        <button onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white border border-[#CBD5E1] rounded-lg p-2.5 text-sm font-bold text-[#0D1B2A] hover:bg-gray-50 transition-colors mb-4">
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          S'inscrire avec Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-[#CBD5E1]"></div>
          <span className="text-[10px] text-[#94A3B8] font-bold uppercase">ou</span>
          <div className="flex-1 h-px bg-[#CBD5E1]"></div>
        </div>

        <form onSubmit={handleRegister} className="space-y-3">
          {error && <div className="bg-[#ffdad6] text-[#ba1a1a] text-xs p-3 rounded-lg">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Nom</label><input value={form.nom} onChange={(e) => u('nom', e.target.value)} className="w-full bg-[#dee8ff]/60 border border-[#CBD5E1] rounded-lg p-2.5 text-sm focus:border-[#E8611A] outline-none" required /></div>
            <div><label className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Prénom</label><input value={form.prenom} onChange={(e) => u('prenom', e.target.value)} className="w-full bg-[#dee8ff]/60 border border-[#CBD5E1] rounded-lg p-2.5 text-sm focus:border-[#E8611A] outline-none" required /></div>
          </div>
          <div><label className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Email</label><input type="email" value={form.email} onChange={(e) => u('email', e.target.value)} className="w-full bg-[#dee8ff]/60 border border-[#CBD5E1] rounded-lg p-2.5 text-sm focus:border-[#E8611A] outline-none" required /></div>
          <div><label className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Mot de passe</label><input type="password" value={form.password} onChange={(e) => u('password', e.target.value)} className="w-full bg-[#dee8ff]/60 border border-[#CBD5E1] rounded-lg p-2.5 text-sm focus:border-[#E8611A] outline-none" required minLength={8} /></div>
          <div>
            <label className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Rôle</label>
            <select value={form.role} onChange={(e) => u('role', e.target.value)} className="w-full bg-[#dee8ff]/60 border border-[#CBD5E1] rounded-lg p-2.5 text-sm focus:border-[#E8611A] outline-none">
              <option value="enqueteur">Enquêteur terrain</option>
              <option value="mairie">Décideur Mairie</option>
              <option value="institution">Institution</option>
            </select>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? 'Inscription...' : "S'inscrire"}</button>
        </form>
        <p className="text-center text-xs text-[#6B7280] mt-4">Déjà inscrit ? <a href="/login" className="text-[#E8611A] underline font-bold">Connexion</a></p>
      </div>
    </div>
  );
}
