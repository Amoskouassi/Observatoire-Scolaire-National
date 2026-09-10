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
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-surface px-4">
      <div className="kpi-card w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-4xl">🇨🇮</span>
          <h1 className="text-headline-sm text-ivoire-nuit mt-2 font-black">Connexion</h1>
          <p className="text-body-sm text-ivoire-gris">Accédez à votre espace</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-error/10 border border-error/20 text-error text-body-sm p-3 rounded-lg">{error}</div>
          )}
          <div>
            <label className="text-label-sm text-ivoire-gris uppercase block mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                   className="w-full bg-surface-container-high/60 border border-ivoire-frontiere rounded-lg p-2.5 text-body-sm focus:border-ivoire-orange focus:ring-2 focus:ring-ivoire-orange/20 outline-none transition-colors" required />
          </div>
          <div>
            <label className="text-label-sm text-ivoire-gris uppercase block mb-1">Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                   className="w-full bg-surface-container-high/60 border border-ivoire-frontiere rounded-lg p-2.5 text-body-sm focus:border-ivoire-orange focus:ring-2 focus:ring-ivoire-orange/20 outline-none transition-colors" required />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Connexion...' : 'Connexion'}
          </button>
        </form>
        <p className="text-center text-body-sm text-ivoire-gris mt-4">
          Pas encore de compte ? <a href="/register" className="text-ivoire-orange hover:underline font-bold">S'inscrire</a>
        </p>
      </div>
    </div>
  );
}
