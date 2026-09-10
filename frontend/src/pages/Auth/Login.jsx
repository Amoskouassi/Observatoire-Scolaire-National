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
    <div className="h-full flex items-center justify-center bg-akwa-beige">
      <div className="card w-full max-w-md mx-4">
        <div className="text-center mb-6">
          <span className="text-4xl">🇨🇮</span>
          <h1 className="text-lg font-black text-akwa-texte mt-2">Connexion</h1>
          <p className="text-xs text-gray-500">Accédez à votre espace</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-button">
              {error}
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="filter-select"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="filter-select"
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Connexion...' : '🔑 Connexion'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-4">
          Pas encore de compte ? <a href="/register" className="text-akwa-orange hover:underline">S'inscrire</a>
        </p>
      </div>
    </div>
  );
}
