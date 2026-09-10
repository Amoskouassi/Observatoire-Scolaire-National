import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await api.login(email, password);
      login(user, token, user.role);
      navigate('/explorer');
    } catch (err) {
      setError(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

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
            <label className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Mot de passe</label>
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
