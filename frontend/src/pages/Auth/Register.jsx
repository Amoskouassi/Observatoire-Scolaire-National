import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';

const ROLES = [
  { value: 'enqueteur', label: 'Enquêteur terrain' },
  { value: 'mairie', label: 'Maire / Conseil Municipal' },
  { value: 'president_region', label: 'Président Conseil Régional' },
  { value: 'ministre', label: 'Ministre / Directeur' },
  { value: 'institution', label: 'Institution / Partenaire' },
  { value: 'directeur_afrique', label: 'Directeur Afrique' },
  { value: 'partenaire', label: 'Partenaire technique' },
  { value: 'chercheur', label: 'Chercheur / Analyste' },
];

const ROLES_WITH_ZONE = ['mairie', 'president_region', 'ministre', 'directeur_afrique'];

export default function Register() {
  const [step, setStep] = useState('form');
  const [form, setForm] = useState({ email: '', password: '', nom: '', prenom: '', role: 'enqueteur' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [verifyError, setVerifyError] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loginCode, setLoginCode] = useState('');
  const { login } = useAuthStore();

  const [zones, setZones] = useState({ districts: [], regions: [], depts: [], communes: [] });
  const [sel, setSel] = useState({ district: null, region: null, departement: null, commune: null });
  const [zonesLoading, setZonesLoading] = useState(false);

  const u = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!ROLES_WITH_ZONE.includes(form.role)) return;
    setZonesLoading(true);
    Promise.all([
      fetch('/districts.geojson').then(r => r.json()),
      fetch('/regions.geojson').then(r => r.json()),
      fetch('/depts.geojson').then(r => r.json()),
      fetch('/sous_prefectures.geojson').then(r => r.json()),
    ]).then(([d, r, dp, sp]) => {
      setZones({
        districts: (d.features || []).map(f => ({ code: f.properties.code, name: f.properties.name })),
        regions: (r.features || []).map(f => ({ code: f.properties.code, name: f.properties.name, district: f.properties.district })),
        depts: (dp.features || []).map(f => ({ code: f.properties.code, name: f.properties.name, region: f.properties.region, district: f.properties.district })),
        communes: (sp.features || []).map(f => ({ code: f.properties.code, name: f.properties.name, departement: f.properties.departement, region: f.properties.region })),
      });
    }).catch(() => {}).finally(() => setZonesLoading(false));
  }, [form.role]);

  const filteredRegions = sel.district
    ? zones.regions.filter(r => r.district === sel.district.name)
    : zones.regions;

  const filteredDepts = sel.region
    ? zones.depts.filter(d => d.region === sel.region.name)
    : [];

  const filteredCommunes = sel.departement
    ? zones.communes.filter(c => c.departement === sel.departement.name)
    : [];

  const needsZone = ROLES_WITH_ZONE.includes(form.role);

  const buildPayload = () => {
    const payload = { ...form };
    if (needsZone) {
      if (form.role === 'mairie') {
        payload.commune_code = sel.commune?.code || undefined;
        payload.departement_code = sel.departement?.code || undefined;
        payload.region_code = sel.region?.code || undefined;
        payload.district_code = sel.district?.code || undefined;
      } else if (form.role === 'president_region') {
        payload.region_code = sel.region?.code || undefined;
        payload.district_code = sel.district?.code || undefined;
      } else if (form.role === 'ministre' || form.role === 'directeur_afrique') {
        payload.district_code = sel.district?.code || undefined;
      }
    }
    return payload;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (needsZone && !sel.district) {
      setError('Veuillez sélectionner au moins votre district.');
      return;
    }
    setLoading(true);
    try {
      const result = await api.register(buildPayload());
      if (result.login_code) setLoginCode(result.login_code);
      setStep('verify');
    } catch (err) { setError(err.message); } finally { setLoading(false); }
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
    if (newCode.every(c => c !== '')) handleVerify(newCode.join(''));
  };

  const handleCodePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) { setCode(pasted.split('')); handleVerify(pasted); }
  };

  const handleVerify = async (codeStr) => {
    setVerifyError('');
    setVerifyLoading(true);
    try {
      const { token, user } = await api.verifyCode(form.email, codeStr);
      login(user, token);
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

  const selectClass = "w-full bg-[#dee8ff]/60 border border-[#CBD5E1] rounded-lg p-2.5 text-sm focus:border-[#E8611A] outline-none";

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
          {loginCode && (
            <div className="bg-[#00796B]/10 border border-[#00796B]/20 rounded-lg p-3 mt-4">
              <p className="text-[10px] font-bold text-[#00796B] uppercase mb-1">🔑 Votre code enquêteur</p>
              <p className="text-lg font-mono font-bold text-[#0D1B2A] tracking-widest">{loginCode}</p>
              <p className="text-[10px] text-[#6B7280] mt-1">Conservez ce code. Il sert à se connecter via « Connexion par code ».</p>
            </div>
          )}
          <div className="flex justify-center gap-2.5 mt-6" onPaste={handleCodePaste}>
            {code.map((digit, i) => (
              <input key={i} data-index={i} type="text" inputMode="numeric" maxLength={1} value={digit}
                onChange={(e) => handleCodeChange(i, e.target.value)}
                className="w-11 h-13 text-center text-xl font-bold bg-[#dee8ff]/60 border border-[#CBD5E1] rounded-lg focus:border-[#E8611A] focus:ring-2 focus:ring-[#E8611A]/20 outline-none transition-colors"
                disabled={verifyLoading} />
            ))}
          </div>
          {verifyError && <div className="bg-[#ffdad6] text-[#ba1a1a] text-xs p-3 rounded-lg mt-4">{verifyError}</div>}
          {verifyLoading && <p className="text-xs text-[#6B7280] mt-4 animate-pulse">Vérification en cours...</p>}
          <div className="mt-6">
            {resendCooldown > 0 ? (
              <p className="text-xs text-[#94A3B8]">Renvoyer dans {resendCooldown}s</p>
            ) : (
              <button onClick={handleResend} className="text-xs text-[#E8611A] font-bold hover:underline">Renvoyer le code</button>
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
    <div className="h-full flex items-center justify-center bg-[#F4EFE6] px-4 py-8">
      <div className="kpi-card w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-4xl">🇨🇮</span>
          <h1 className="text-lg font-bold text-[#0D1B2A] mt-2">Inscription</h1>
          <p className="text-[11px] text-[#94A3B8] mt-1">Rejoignez l'Observatoire Scolaire National</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-3">
          {error && <div className="bg-[#ffdad6] text-[#ba1a1a] text-xs p-3 rounded-lg">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Nom</label>
              <input value={form.nom} onChange={(e) => u('nom', e.target.value)} className="w-full bg-[#dee8ff]/60 border border-[#CBD5E1] rounded-lg p-2.5 text-sm focus:border-[#E8611A] outline-none" required /></div>
            <div><label className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Prénom</label>
              <input value={form.prenom} onChange={(e) => u('prenom', e.target.value)} className="w-full bg-[#dee8ff]/60 border border-[#CBD5E1] rounded-lg p-2.5 text-sm focus:border-[#E8611A] outline-none" required /></div>
          </div>

          <div><label className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => u('email', e.target.value)} className="w-full bg-[#dee8ff]/60 border border-[#CBD5E1] rounded-lg p-2.5 text-sm focus:border-[#E8611A] outline-none" required /></div>

          <div><label className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Mot de passe</label>
            <input type="password" value={form.password} onChange={(e) => u('password', e.target.value)} className="w-full bg-[#dee8ff]/60 border border-[#CBD5E1] rounded-lg p-2.5 text-sm focus:border-[#E8611A] outline-none" required minLength={8} /></div>

          <div>
            <label className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Votre rôle</label>
            <select value={form.role} onChange={(e) => { u('role', e.target.value); setSel({ district: null, region: null, departement: null, commune: null }); }} className={selectClass}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {needsZone && (
            <div className="bg-[#F4EFE6] border border-[#CBD5E1] rounded-lg p-3 space-y-2.5">
              <p className="text-[10px] font-bold text-[#E8611A] uppercase">📍 Votre circonscription</p>
              {zonesLoading && <p className="text-xs text-[#94A3B8] animate-pulse">Chargement...</p>}

              <div>
                <label className="text-xs font-bold text-[#6B7280] uppercase block mb-1">District</label>
                <select value={sel.district?.code || ''} onChange={(e) => {
                  const z = zones.districts.find(d => d.code === e.target.value);
                  setSel({ district: z || null, region: null, departement: null, commune: null });
                }} className={selectClass} required>
                  <option value="">— Sélectionner un district —</option>
                  {zones.districts.map(z => <option key={z.code} value={z.code}>{z.name}</option>)}
                </select>
              </div>

              {(form.role === 'president_region' || form.role === 'mairie') && (
                <div>
                  <label className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Région</label>
                  <select value={sel.region?.code || ''} onChange={(e) => {
                    const z = zones.regions.find(r => r.code === e.target.value);
                    setSel(p => ({ ...p, region: z || null, departement: null, commune: null }));
                  }} className={selectClass} required disabled={!sel.district}>
                    <option value="">— Sélectionner une région —</option>
                    {filteredRegions.map(z => <option key={z.code} value={z.code}>{z.name}</option>)}
                  </select>
                </div>
              )}

              {form.role === 'mairie' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Département</label>
                    <select value={sel.departement?.code || ''} onChange={(e) => {
                      const z = zones.depts.find(d => d.code === e.target.value);
                      setSel(p => ({ ...p, departement: z || null, commune: null }));
                    }} className={selectClass} required disabled={!sel.region}>
                      <option value="">— Sélectionner un département —</option>
                      {filteredDepts.map(z => <option key={z.code} value={z.code}>{z.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Commune / Sous-préfecture</label>
                    <select value={sel.commune?.code || ''} onChange={(e) => {
                      const z = zones.communes.find(c => c.code === e.target.value);
                      setSel(p => ({ ...p, commune: z || null }));
                    }} className={selectClass} required disabled={!sel.departement}>
                      <option value="">— Sélectionner une commune —</option>
                      {filteredCommunes.map(z => <option key={z.code} value={z.code}>{z.name}</option>)}
                    </select>
                  </div>
                </>
              )}

              {sel.district && (
                <div className="text-[10px] text-[#6B7280] bg-white rounded-lg p-2 border border-[#CBD5E1]">
                  <span className="font-bold text-[#0D1B2A]">📍</span> {sel.district.name}
                  {sel.region && <span> → {sel.region.name}</span>}
                  {sel.departement && <span> → {sel.departement.name}</span>}
                  {sel.commune && <span> → {sel.commune.name}</span>}
                </div>
              )}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Inscription...' : "S'inscrire"}
          </button>
        </form>

        <p className="text-center text-xs text-[#6B7280] mt-4">
          Déjà inscrit ? <Link to="/login" className="text-[#E8611A] underline font-bold">Connexion</Link>
        </p>
      </div>
    </div>
  );
}
