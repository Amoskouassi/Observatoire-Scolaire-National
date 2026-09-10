import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';

export default function Register() {
  const [form, setForm] = useState({
    email: '', password: '', nom: '', prenom: '',
    role: 'enqueteur', organisation: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await api.register(form);
      login(user, token, user.role);
      navigate('/explorer');
    } catch (err) {
      setError(err.message || 'Erreur d\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-surface px-4">
      <div className="kpi-card w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-4xl">🇨🇮</span>
          <h1 className="text-headline-sm text-ivoire-nuit mt-2 font-black">Inscription</h1>
          <p className="text-body-sm text-ivoire-gris">Créez votre compte</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="bg-error/10 border border-error/20 text-error text-body-sm p-3 rounded-lg">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-label-sm text-ivoire-gris uppercase block mb-1">Nom</label>
              <input type="text" value={form.nom} onChange={(e) => update('nom', e.target.value)}
                     className="w-full bg-surface-container-high/60 border border-ivoire-frontiere rounded-lg p-2.5 text-body-sm focus:border-ivoire-orange outline-none transition-colors" required />
            </div>
            <div>
              <label className="text-label-sm text-ivoire-gris uppercase block mb-1">Prénom</label>
              <input type="text" value={form.prenom} onChange={(e) => update('prenom', e.target.value)}
                     className="w-full bg-surface-container-high/60 border border-ivoire-frontiere rounded-lg p-2.5 text-body-sm focus:border-ivoire-orange outline-none transition-colors" required />
            </div>
          </div>
          <div>
            <label className="text-label-sm text-ivoire-gris uppercase block mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)}
                   className="w-full bg-surface-container-high/60 border border-ivoire-frontiere rounded-lg p-2.5 text-body-sm focus:border-ivoire-orange outline-none transition-colors" required />
          </div>
          <div>
            <label className="text-label-sm text-ivoire-gris uppercase block mb-1">Mot de passe</label>
            <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)}
                   className="w-full bg-surface-container-high/60 border border-ivoire-frontiere rounded-lg p-2.5 text-body-sm focus:border-ivoire-orange outline-none transition-colors" required minLength={8} />
          </div>
          <div>
            <label className="text-label-sm text-ivoire-gris uppercase block mb-1">Rôle</label>
            <select value={form.role} onChange={(e) => update('role', e.target.value)}
                    className="w-full bg-surface-container-high/60 border border-ivoire-frontiere rounded-lg p-2.5 text-body-sm focus:border-ivoire-orange outline-none transition-colors">
              <option value="enqueteur">Enquêteur terrain</option>
              <option value="mairie">Décideur Mairie</option>
              <option value="institution">Institution / Bailleur</option>
            </select>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Inscription...' : "S'inscrire"}
          </button>
        </form>
        <p className="text-center text-body-sm text-ivoire-gris mt-4">
          Déjà inscrit ? <a href="/login" className="text-ivoire-orange hover:underline font-bold">Se connecter</a>
        </p>
      </div>
    </div>
  );
}
