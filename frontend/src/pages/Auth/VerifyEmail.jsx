import { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const email = location.state?.email || '';
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const inputRefs = useRef([]);

  const handleCodeChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (newCode.every(c => c !== '')) {
      handleVerify(newCode.join(''));
    }
  };

  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
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
    if (!email) return;
    setError('');
    setLoading(true);
    try {
      const { token, user } = await api.verifyCode(email, codeStr);
      login(user, token, user.role);
      navigate('/explorer');
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleResend = async () => {
    try {
      await api.resendCode(email);
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown(prev => { if (prev <= 1) { clearInterval(interval); return 0; } return prev - 1; });
      }, 1000);
    } catch {}
  };

  if (!email) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F4EFE6] px-4">
        <div className="kpi-card w-full max-w-md text-center">
          <p className="text-sm text-[#6B7280]">Aucun email à vérifier.</p>
          <button onClick={() => navigate('/register')} className="btn-primary mt-4">S'inscrire</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center bg-[#F4EFE6] px-4">
      <div className="kpi-card w-full max-w-md text-center">
        <span className="text-5xl">📧</span>
        <h1 className="text-lg font-bold text-[#0D1B2A] mt-3">Vérifiez votre email</h1>
        <p className="text-xs text-[#6B7280] mt-2">
          Un code à 6 chiffres a été envoyé à<br />
          <strong className="text-[#0D1B2A]">{email}</strong>
        </p>

        <div className="flex justify-center gap-2.5 mt-6" onPaste={handleCodePaste}>
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleCodeChange(i, e.target.value)}
              onKeyDown={(e) => handleCodeKeyDown(i, e)}
              className="w-11 h-13 text-center text-xl font-bold bg-[#dee8ff]/60 border border-[#CBD5E1] rounded-lg focus:border-[#E8611A] focus:ring-2 focus:ring-[#E8611A]/20 outline-none transition-colors"
              disabled={loading}
            />
          ))}
        </div>

        {error && (
          <div className="bg-[#ffdad6] text-[#ba1a1a] text-xs p-3 rounded-lg mt-4">{error}</div>
        )}

        {loading && (
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

        <button onClick={() => navigate('/register')}
          className="text-xs text-[#94A3B8] mt-4 hover:underline block mx-auto">
          Modifier l'adresse email
        </button>
      </div>
    </div>
  );
}
