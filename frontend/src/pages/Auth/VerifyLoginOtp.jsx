import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';

export default function VerifyLoginOtp() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const inputRefs = useRef([]);
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { temp_token, email_masked } = location.state || {};

  useEffect(() => {
    if (!temp_token) navigate('/login');
  }, [temp_token, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError('');
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (newCode.every(c => c !== '') && newCode.join('').length === 6) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
      handleVerify(pasted);
    }
  };

  const handleVerify = async (otp) => {
    setLoading(true);
    setError('');
    try {
      const result = await api.verifyLoginOtp(temp_token, otp);
      if (result.requires_2fa) {
        navigate('/verify-2fa', {
          state: { partial_token: result.partial_token, email_masked: result.email_masked },
        });
        return;
      }
      login(result.user, result.token, result.session);
      navigate('/explorer');
    } catch (err) {
      setError(err.message || 'Code invalide');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendCooldown(60);
    setError('');
    setCode(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  if (!temp_token) return null;

  return (
    <div className="h-full flex items-center justify-center bg-[#F4EFE6] px-4">
      <div className="kpi-card w-full max-w-md">
        <div className="text-center mb-6">
          <span className="material-symbols-outlined text-[#E8611A] text-5xl">mail</span>
          <h1 className="text-lg font-bold text-[#0D1B2A] mt-2">Verification par email</h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Un code a 6 chiffres a ete envoye a<br />
            <strong className="text-[#0D1B2A]">{email_masked}</strong>
          </p>
        </div>

        {error && (
          <div className="bg-[#ffdad6] border border-[#ba1a1a]/20 text-[#ba1a1a] text-xs p-3 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
          {code.map((digit, i) => (
            <input
              key={i}
              ref={el => inputRefs.current[i] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className="w-11 h-12 text-center text-lg font-black text-[#0D1B2A] bg-[#dee8ff]/60 border border-[#CBD5E1] rounded-lg focus:border-[#E8611A] focus:ring-2 focus:ring-[#E8611A]/20 outline-none transition-colors"
            />
          ))}
        </div>

        <button
          onClick={() => handleVerify(code.join(''))}
          disabled={loading || code.some(c => !c)}
          className="btn-primary w-full"
        >
          {loading ? 'Verification...' : 'Verifier'}
        </button>

        <div className="text-center mt-4">
          {resendCooldown > 0 ? (
            <p className="text-[10px] text-[#94A3B8]">
              Renvoyer le code dans {resendCooldown}s
            </p>
          ) : (
            <button onClick={handleResend} className="text-[10px] text-[#E8611A] font-bold hover:underline">
              Renvoyer le code
            </button>
          )}
        </div>

        <p className="text-center text-xs text-[#6B7280] mt-4">
          <Link to="/login" className="text-[#E8611A] underline font-bold">Retour a la connexion</Link>
        </p>
      </div>
    </div>
  );
}
