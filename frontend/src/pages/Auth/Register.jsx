import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';

export default function Register() {
  const [form, setForm] = useState({
    email: '', password: '', nom: '', prenom: '',
    role: 'enqueteur', organisation: '', commune_code: '', region_code: '',
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
    <div className="h-full flex items-center justify-center bg-akwa-beige">
      <div className="card w-full max-w-md mx-4">
        <div className="text-center mb-6">
          <span className="text-4xl">🇨🇮</span>
          <h1 className="text-lg font-black text-akwa-texte mt-2">Inscription</h1>
          <p className="text-xs text-gray-500">Créez votre compte</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-button">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Nom</label>
              <input type="text" value={form.nom} onChange={(e) => update('nom', e.target.value)} className="filter-select" required />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Prénom</label>
              <input type="text" value={form.prenom} onChange={(e) => update('prenom', e.target.value)} className="filter-select" required />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="filter-select" required />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Mot de passe</label>
            <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} className="filter-select" required minLength={8} />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Rôle</label>
            <select value={form.role} onChange={(e) => update('role', e.target.value)} className="filter-select">
              <option value="enqueteur">📱 Enquêteur terrain</option>
              <option value="mairie">🏛️ Décideur Mairie</option>
              <option value="institution">🌍 Institution / Bailleur</option>
            </select>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Inscription...' : '✅ S\'inscrire'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-4">
          Déjà inscrit ? <a href="/login" className="text-akwa-orange hover:underline">Se connecter</a>
        </p>
      </div>
    </div>
  );
}
