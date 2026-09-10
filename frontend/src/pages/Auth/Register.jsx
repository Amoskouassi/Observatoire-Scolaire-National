import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', nom: '', prenom: '', role: 'enqueteur' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const u = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await api.register(form);
      login(user, token, user.role);
      navigate('/explorer');
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="h-full flex items-center justify-center bg-[#F4EFE6] px-4">
      <div className="kpi-card w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-4xl">🇨🇮</span>
          <h1 className="text-lg font-bold text-[#0D1B2A] mt-2">Inscription</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
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
          <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? '...' : "S'inscrire"}</button>
        </form>
        <p className="text-center text-xs text-[#6B7280] mt-4">Déjà inscrit ? <a href="/login" className="text-[#E8611A] underline font-bold">Connexion</a></p>
      </div>
    </div>
  );
}
