import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';

const TABS = [
  { id: 1, label: 'Géographie', icon: 'location_on', color: '#0B7A3E' },
  { id: 2, label: 'Inventaire', icon: 'table_chart', color: '#0D1B2A' },
  { id: 3, label: 'Enseignants', icon: 'groups', color: '#0D1B2A' },
  { id: 4, label: 'Hygiène', icon: 'water_drop', color: '#E8611A' },
];

const ANNEES_SCOLAIRES = ['2025-2026','2024-2025','2023-2024'];

const defaultClasse = () => ({ niveau: '', filles: '', garcons: '', bancs: '' });

const initialState = {
  district: '', region: '', departement: '', sous_prefecture: '',
  localite: '', milieu: '', voie_acces: '',
  nom_ecole: '', statut_juridique: '', code_mena: '',
  niveau_enseignement: '', annee_creation: '', annee_scolaire: '',
  salles_fonctionnelles: '',
  classes: [defaultClasse()],
  nb_enseignants_presents: '', deficit_enseignants: false,
  nb_enseignants_manquants: '', classes_jumelees: false, matieres_penurie: [],
  materiaux_batiment: '', presence_cloture: false, securite_routiere: false,
  nb_latrines: '', eau_potable: false, source_eau_village: '',
  localite_raccordee_elec: false, ecole_electrifiee: false,
  source_energie: '', poteau_100m: false,
  cantine_fonctionnelle: false, source_cantine: '',
  latitude: null, longitude: null, gps精度: null,
  photo: null, photoPreview: null,
  commentaires: '',
};

const inputCls = "w-full bg-white border border-[#CBD5E1] rounded-lg p-2.5 text-sm focus:border-[#E8611A] outline-none transition";
const labelCls = "text-[11px] font-bold text-[#6B7280] uppercase block mb-1";
const selectCls = "w-full bg-white border border-[#CBD5E1] rounded-lg p-2.5 text-sm focus:border-[#E8611A] outline-none appearance-none bg-no-repeat bg-[right_10px_center] bg-[length:16px]";
const selectStyle = { backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2394A3B8' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")" };

function YesNon({ value, onChange, label }) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => onChange(true)}
        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${value === true ? 'bg-[#0B7A3E] text-white border-[#0B7A3E]' : 'bg-white text-[#475569] border-[#CBD5E1] hover:border-[#0B7A3E]/30'}`}>
        Oui
      </button>
      <button type="button" onClick={() => onChange(false)}
        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${value === false ? 'bg-[#E8611A] text-white border-[#E8611A]' : 'bg-white text-[#475569] border-[#CBD5E1] hover:border-[#E8611A]/30'}`}>
        Non
      </button>
    </div>
  );
}

function RadioGroup({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => {
        const v = typeof o === 'string' ? o : o.value;
        const l = typeof o === 'string' ? o : o.label;
        return (
          <button key={v} type="button" onClick={() => onChange(v)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition capitalize ${value === v ? 'bg-[#E8611A] text-white border-[#E8611A]' : 'bg-white text-[#475569] border-[#CBD5E1] hover:border-[#E8611A]/30'}`}>
            {l}
          </button>
        );
      })}
    </div>
  );
}

export default function Collecte() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [step, setStep] = useState(1);
  const [f, setF] = useState(initialState);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const photoRef = useRef(null);

  const [zones, setZones] = useState({ districts: [], regions: [], depts: [], communes: [] });
  const [sel, setSel] = useState({ district: null, region: null, departement: null, commune: null });

  useEffect(() => {
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
    }).catch(() => {});
  }, []);

  const filteredRegions = sel.district
    ? zones.regions.filter(r => r.district === sel.district.name)
    : [];

  const filteredDepts = sel.region
    ? zones.depts.filter(d => d.region === sel.region.name)
    : [];

  const filteredCommunes = sel.departement
    ? zones.communes.filter(c => c.departement === sel.departement.name)
    : [];

  const u = (k, v) => setF(p => ({ ...p, [k]: v }));

  const getGps = useCallback(() => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        u('latitude', pos.coords.latitude);
        u('longitude', pos.coords.longitude);
        u('gps精度', pos.coords.accuracy);
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => { getGps(); }, [getGps]);

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      u('photo', file);
      u('photoPreview', ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const updateClasse = (idx, key, val) => {
    setF(p => {
      const classes = [...p.classes];
      classes[idx] = { ...classes[idx], [key]: val };
      return { ...p, classes };
    });
  };

  const addClasse = () => setF(p => ({ ...p, classes: [...p.classes, defaultClasse()] }));
  const removeClasse = (idx) => setF(p => ({ ...p, classes: p.classes.filter((_, i) => i !== idx) }));

  const validate = () => {
    if (!f.nom_ecole) return "Nom de l'école requis";
    if (!f.district) return "District requis";
    if (!f.region) return "Région requise";
    if (!f.departement) return "Département requis";
    if (!f.sous_prefecture) return "Sous-préfecture requise";
    if (!f.latitude || !f.longitude) return "GPS non acquis";
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSubmitting(true);
    setError(null);
    try {
      let photoUrl = null;
      if (f.photo) {
        const fd = new FormData();
        fd.append('photo', f.photo);
        const uploadRes = await fetch(`${api.baseUrl}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        }).then(r => r.json());
        photoUrl = uploadRes.url || uploadRes.path;
      }

      await api.submitCollecte({
        code_mena: f.code_mena || 'TEMP-' + Date.now(),
        ecole_id: null,
        district: sel.district?.name || f.district,
        region: sel.region?.name || f.region,
        departement: sel.departement?.name || f.departement,
        sous_prefecture: sel.commune?.name || f.sous_prefecture,
        localite: f.localite,
        milieu: f.milieu,
        voie_acces: f.voie_acces,
        nom_ecole: f.nom_ecole,
        statut_juridique: f.statut_juridique,
        niveau_enseignement: f.niveau_enseignement,
        annee_creation: f.annee_creation ? Number(f.annee_creation) : null,
        annee_scolaire: f.annee_scolaire,
        salles_fonctionnelles: f.salles_fonctionnelles ? Number(f.salles_fonctionnelles) : null,
        inventaire_classes: f.classes.map(c => ({
          classe: c.niveau,
          filles: Number(c.filles) || 0,
          garcons: Number(c.garcons) || 0,
          bancs_actifs: Number(c.bancs) || 0,
          besoin_bancs: 0,
        })),
        nb_enseignants_presents: f.nb_enseignants_presents ? Number(f.nb_enseignants_presents) : null,
        deficit_enseignants: f.deficit_enseignants,
        nb_enseignants_manquants: f.nb_enseignants_manquants ? Number(f.nb_enseignants_manquants) : null,
        classes_jumelees: f.classes_jumelees,
        matieres_penurie: f.matieres_penurie,
        materiaux_batiment: f.materiaux_batiment,
        presence_cloture: f.presence_cloture,
        securite_routiere: f.securite_routiere,
        nb_latrines: f.nb_latrines ? Number(f.nb_latrines) : null,
        eau_potable: f.eau_potable,
        source_eau_village: f.source_eau_village,
        localite_raccordee_elec: f.localite_raccordee_elec,
        ecole_electrifiee: f.ecole_electrifiee,
        source_energie: f.source_energie,
        poteau_100m: f.poteau_100m,
        cantine_fonctionnelle: f.cantine_fonctionnelle,
        source_cantine: f.source_cantine,
        latitude: f.latitude,
        longitude: f.longitude,
        photos: photoUrl ? [{ url: photoUrl, type: 'facade' }] : [],
        commentaires: f.commentaires,
        date_collecte: new Date().toISOString(),
      });
      setSubmitted(true);
    } catch (e) {
      setError(e.message || 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#F4EFE6] gap-4 px-6">
        <div className="w-16 h-16 rounded-full bg-[#0B7A3E]/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-[32px] text-[#0B7A3E]">check_circle</span>
        </div>
        <h2 className="text-lg font-extrabold text-[#0D1B2A] text-center">Collecte envoyée !</h2>
        <p className="text-xs text-[#6B7280] text-center">Les données de {f.nom_ecole} ont été enregistrées.</p>
        <button onClick={() => navigate('/explorer')} className="px-6 py-2.5 bg-[#E8611A] text-white text-sm font-bold rounded-xl">Retour à la carte</button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#F4EFE6]">
      <div className="px-4 pt-4 pb-2 bg-white border-b border-[#CBD5E1]/20">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-sm font-extrabold text-[#0D1B2A]">Collecte Terrain</h1>
            <p className="text-[10px] text-[#94A3B8] font-medium">Formulaire 4 onglets</p>
          </div>
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center">
            <span className="material-symbols-outlined text-[16px] text-[#475569]">close</span>
          </button>
        </div>
        <div className="flex gap-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setStep(t.id)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition ${step === t.id ? 'text-white' : 'bg-[#F1F5F9] text-[#94A3B8]'}`}
              style={step === t.id ? { backgroundColor: t.color } : {}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {error && (
          <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">{error}</div>
        )}

        {step === 1 && (
          <div className="space-y-4 animate-fade-in-up">
            <Section title="Cascade géographique" color="#0B7A3E">
              <Field label="Q1 — District">
                <select value={sel.district?.code || ''} onChange={e => {
                  const z = zones.districts.find(d => d.code === e.target.value);
                  setSel({ district: z || null, region: null, departement: null, commune: null });
                  u('district', z?.name || '');
                  u('region', ''); u('departement', ''); u('sous_prefecture', '');
                }} className={selectCls} style={selectStyle}>
                  <option value="">Sélectionner un district...</option>
                  {zones.districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Q2 — Région">
                <select value={sel.region?.code || ''} onChange={e => {
                  const z = zones.regions.find(r => r.code === e.target.value);
                  setSel(p => ({ ...p, region: z || null, departement: null, commune: null }));
                  u('region', z?.name || '');
                  u('departement', ''); u('sous_prefecture', '');
                }} className={selectCls} style={selectStyle} disabled={!sel.district}>
                  <option value="">{sel.district ? 'Sélectionner une région...' : 'Sélectionner d\'abord un district'}</option>
                  {filteredRegions.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                </select>
              </Field>
              <Field label="Q3 — Département">
                <select value={sel.departement?.code || ''} onChange={e => {
                  const z = zones.depts.find(d => d.code === e.target.value);
                  setSel(p => ({ ...p, departement: z || null, commune: null }));
                  u('departement', z?.name || '');
                  u('sous_prefecture', '');
                }} className={selectCls} style={selectStyle} disabled={!sel.region}>
                  <option value="">{sel.region ? 'Sélectionner un département...' : 'Sélectionner d\'abord une région'}</option>
                  {filteredDepts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Q4 — Sous-Préfecture / Commune">
                <select value={sel.commune?.code || ''} onChange={e => {
                  const z = zones.communes.find(c => c.code === e.target.value);
                  setSel(p => ({ ...p, commune: z || null }));
                  u('sous_prefecture', z?.name || '');
                }} className={selectCls} style={selectStyle} disabled={!sel.departement}>
                  <option value="">{sel.departement ? 'Sélectionner une sous-préfecture...' : 'Sélectionner d\'abord un département'}</option>
                  {filteredCommunes.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Q5 — Localité / Village / Quartier">
                <input value={f.localite} onChange={e => u('localite', e.target.value)} className={inputCls} placeholder="Nom du village ou quartier" />
              </Field>
            </Section>

            <Section title="Identification" color="#E8611A">
              <Field label="Q6 — Typologie du milieu">
                <RadioGroup value={f.milieu} onChange={v => u('milieu', v)} options={['urbain', 'rural']} />
              </Field>
              <Field label="Q7 — Type de voie d'accès">
                <RadioGroup value={f.voie_acces} onChange={v => u('voie_acces', v)} options={[
                  { value: 'goudron', label: 'Goudron' },
                  { value: 'piste_praticable', label: 'Piste praticable' },
                  { value: 'piste_saisonniere', label: 'Piste saisonnière' },
                ]} />
              </Field>
              <Field label="Q8 — Nom de l'école">
                <input value={f.nom_ecole} onChange={e => u('nom_ecole', e.target.value)} className={inputCls} placeholder="École Primaire de..." />
              </Field>
              <Field label="Q9 — Statut juridique">
                <RadioGroup value={f.statut_juridique} onChange={v => u('statut_juridique', v)} options={[
                  { value: 'public', label: 'Public' },
                  { value: 'prive_laic', label: 'Privé laïc' },
                  { value: 'prive_confessionnel', label: 'Privé confessionnel' },
                  { value: 'communaute', label: 'Communautaire' },
                ]} />
              </Field>
              <Field label="Q10 — Code Matricule MENA">
                <input value={f.code_mena} onChange={e => u('code_mena', e.target.value)} className={inputCls}
                  placeholder={f.statut_juridique === 'communaute' ? 'Matricule TEMP auto-généré' : 'PRIM-001234'}
                  disabled={f.statut_juridique === 'communaute'} />
              </Field>
              <Field label="Q11 — Niveau d'enseignement">
                <RadioGroup value={f.niveau_enseignement} onChange={v => u('niveau_enseignement', v)} options={['primaire', 'secondaire', 'superieur']} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Q12 — Année création">
                  <input type="number" value={f.annee_creation} onChange={e => u('annee_creation', e.target.value)} className={inputCls} placeholder="1987" min="1900" max="2030" />
                </Field>
                <Field label="Q12B — Année scolaire">
                  <select value={f.annee_scolaire} onChange={e => u('annee_scolaire', e.target.value)} className={selectCls} style={selectStyle}>
                    <option value="">--</option>
                    {ANNEES_SCOLAIRES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </Field>
              </div>
            </Section>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in-up">
            <Section title="Inventaire par classe" color="#0D1B2A">
              <Field label="Q13 — Salles de classe fonctionnelles">
                <input type="number" value={f.salles_fonctionnelles} onChange={e => u('salles_fonctionnelles', e.target.value)} className={inputCls} min="0" placeholder="8" />
              </Field>

              {f.classes.map((cl, idx) => (
                <div key={idx} className="bg-[#FAF8F3] border border-[#CBD5E1]/30 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#0D1B2A]">Classe {idx + 1}</span>
                    {f.classes.length > 1 && (
                      <button onClick={() => removeClasse(idx)} className="text-[10px] text-red-500 font-bold">Supprimer</button>
                    )}
                  </div>
                  <Field label="Niveau">
                    <select value={cl.niveau} onChange={e => updateClasse(idx, 'niveau', e.target.value)} className={selectCls} style={selectStyle}>
                      <option value="">Choisir...</option>
                      {f.niveau_enseignement === 'secondaire' ? (
                        ['6ème','5ème','4ème','3ème','Seconde','Première','Terminale'].map(n => <option key={n} value={n}>{n}</option>)
                      ) : (
                        ['CP1','CP2','CE1','CE2','CM1','CM2'].map(n => <option key={n} value={n}>{n}</option>)
                      )}
                    </select>
                  </Field>
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Filles">
                      <input type="number" value={cl.filles} onChange={e => updateClasse(idx, 'filles', e.target.value)} className={inputCls} min="0" />
                    </Field>
                    <Field label="Garçons">
                      <input type="number" value={cl.garcons} onChange={e => updateClasse(idx, 'garcons', e.target.value)} className={inputCls} min="0" />
                    </Field>
                    <Field label="Bancs">
                      <input type="number" value={cl.bancs} onChange={e => updateClasse(idx, 'bancs', e.target.value)} className={inputCls} min="0" />
                    </Field>
                  </div>
                </div>
              ))}

              <button onClick={addClasse} className="w-full py-2.5 border-2 border-dashed border-[#CBD5E1] rounded-xl text-xs font-bold text-[#94A3B8] hover:border-[#E8611A] hover:text-[#E8611A] transition flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">add</span> Ajouter une classe
              </button>

              {f.classes.length > 0 && (
                <div className="bg-[#F1F5F9] rounded-lg p-2.5 flex items-center justify-between">
                  <span className="text-[10px] text-[#6B7280] font-bold">Total élèves</span>
                  <span className="text-sm font-extrabold text-[#0D1B2A]">
                    {f.classes.reduce((s, c) => s + (Number(c.filles) || 0) + (Number(c.garcons) || 0), 0).toLocaleString('fr-FR')}
                  </span>
                </div>
              )}
            </Section>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in-up">
            <Section title="Enseignants" color="#0D1B2A">
              <Field label="Q14 — Nombre d'enseignants présents">
                <input type="number" value={f.nb_enseignants_presents} onChange={e => u('nb_enseignants_presents', e.target.value)} className={inputCls} min="0" />
              </Field>
              <Field label="Q15 — Déficience d'enseignants ?">
                <YesNon value={f.deficit_enseignants} onChange={v => u('deficit_enseignants', v)} />
              </Field>
              {f.deficit_enseignants && (
                <>
                  <Field label="Q15A — Nombre manquants">
                    <input type="number" value={f.nb_enseignants_manquants} onChange={e => u('nb_enseignants_manquants', e.target.value)} className={inputCls} min="0" />
                  </Field>
                  {f.niveau_enseignement === 'primaire' && (
                    <Field label="Q15B — Classes jumelées ?">
                      <YesNon value={f.classes_jumelees} onChange={v => u('classes_jumelees', v)} />
                    </Field>
                  )}
                  {f.niveau_enseignement === 'secondaire' && (
                    <Field label="Q15C — Matières en pénurie">
                      <div className="flex flex-wrap gap-1.5">
                        {['Mathématiques','Français','Sciences','Anglais','Histoire-Géo','SVT','Physique-Chimie'].map(m => {
                          const active = f.matieres_penurie.includes(m);
                          return (
                            <button key={m} type="button"
                              onClick={() => u('matieres_penurie', active ? f.matieres_penurie.filter(v => v !== m) : [...f.matieres_penurie, m])}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${active ? 'bg-[#E8611A] text-white border-[#E8611A]' : 'bg-white text-[#475569] border-[#CBD5E1]'}`}>
                              {m}
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                  )}
                </>
              )}
            </Section>

            <Section title="Bâtiment & Sécurité" color="#0D1B2A">
              <Field label="Q16 — Matériau des bâtiments">
                <RadioGroup value={f.materiaux_batiment} onChange={v => u('materiaux_batiment', v)} options={[
                  { value: 'parpaing_ciment', label: 'Parpaing' },
                  { value: 'brique_terre', label: 'Brique terre' },
                  { value: 'bois', label: 'Bois' },
                  { value: 'boue_banco', label: 'Boue/banco' },
                  { value: 'paillote', label: 'Paillote' },
                ]} />
              </Field>
              <Field label="Q17 — Présence d'une clôture ?">
                <YesNon value={f.presence_cloture} onChange={v => u('presence_cloture', v)} />
              </Field>
              {f.milieu === 'urbain' && (
                <Field label="Q18 — Sécurité routière aux abords ?">
                  <YesNon value={f.securite_routiere} onChange={v => u('securite_routiere', v)} />
                </Field>
              )}
            </Section>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 animate-fade-in-up">
            <Section title="Hygiène & Eau" color="#E8611A">
              <Field label="Q19 — Nombre de cabines de latrines fonctionnelles">
                <input type="number" value={f.nb_latrines} onChange={e => u('nb_latrines', e.target.value)} className={inputCls} min="0" />
              </Field>
              <Field label="Q20 — Accès à l'eau potable ?">
                <YesNon value={f.eau_potable} onChange={v => u('eau_potable', v)} />
              </Field>
              {f.eau_potable === false && (
                <Field label="Q20A — Source d'eau du village">
                  <RadioGroup value={f.source_eau_village} onChange={v => u('source_eau_village', v)} options={[
                    { value: 'sodeci', label: 'SODECI' },
                    { value: 'forage_village', label: 'Forage village' },
                    { value: 'aucun', label: 'Aucun' },
                  ]} />
                </Field>
              )}
            </Section>

            <Section title="Électricité" color="#E8611A">
              <Field label="Q21 — Localité raccordée au réseau CIE ?">
                <YesNon value={f.localite_raccordee_elec} onChange={v => u('localite_raccordee_elec', v)} />
              </Field>
              <Field label="Q22 — L'école est-elle électrifiée ?">
                <YesNon value={f.ecole_electrifiee} onChange={v => u('ecole_electrifiee', v)} />
              </Field>
              {f.ecole_electrifiee === true && (
                <Field label="Q22A — Source d'énergie">
                  <RadioGroup value={f.source_energie} onChange={v => u('source_energie', v)} options={[
                    { value: 'reseau_cie', label: 'Réseau CIE' },
                    { value: 'panneaux_solaires', label: 'Panneaux solaires' },
                    { value: 'groupe_electrogene', label: 'Groupe électrogène' },
                  ]} />
                </Field>
              )}
              {f.ecole_electrifiee === false && (
                <Field label="Q22B — Poteau électrique à moins de 100m ?">
                  <YesNon value={f.poteau_100m} onChange={v => u('poteau_100m', v)} />
                </Field>
              )}
            </Section>

            <Section title="Cantine" color="#E8611A">
              <Field label="Q23 — Cantine scolaire fonctionnelle ?">
                <YesNon value={f.cantine_fonctionnelle} onChange={v => u('cantine_fonctionnelle', v)} />
              </Field>
              {f.cantine_fonctionnelle === true && (
                <Field label="Q23A — Source d'approvisionnement">
                  <RadioGroup value={f.source_cantine} onChange={v => u('source_cantine', v)} options={[
                    { value: 'unicef_pam', label: 'UNICEF/PAM' },
                    { value: 'parents', label: 'Parents' },
                    { value: 'collectivite', label: 'Collectivité' },
                  ]} />
                </Field>
              )}
            </Section>

            <Section title="Géolocalisation & Photo" color="#E8611A">
              <div className="bg-white border border-[#CBD5E1]/30 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-[#0D1B2A]">Q24 — Point GPS</span>
                  <button onClick={getGps} className="text-[10px] text-[#E8611A] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">my_location</span>
                    {gpsLoading ? 'Acquisition...' : 'Actualiser'}
                  </button>
                </div>
                {f.latitude ? (
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="material-symbols-outlined text-[14px] text-[#0B7A3E]">check_circle</span>
                    <span className="text-[#0D1B2A] font-mono">{f.latitude.toFixed(5)}, {f.longitude.toFixed(5)}</span>
                    <span className="text-[#94A3B8]">±{Math.round(f.gps精度 || 0)}m</span>
                  </div>
                ) : (
                  <p className="text-[10px] text-[#94A3B8]">Géolocalisation en cours...</p>
                )}
              </div>

              <Field label="Q25 — Photo de la façade">
                <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
                {f.photoPreview ? (
                  <div className="relative">
                    <img src={f.photoPreview} alt="Façade" className="w-full h-40 object-cover rounded-xl" />
                    <button onClick={() => { u('photo', null); u('photoPreview', null); }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[14px] text-white">close</span>
                    </button>
                  </div>
                ) : (
                  <button onClick={() => photoRef.current?.click()}
                    className="w-full border-2 border-dashed border-[#CBD5E1] rounded-xl p-6 text-center hover:border-[#E8611A] transition">
                    <span className="material-symbols-outlined text-[#E8611A] text-[32px]">add_a_photo</span>
                    <p className="text-[11px] text-[#6B7280] mt-1 font-medium">Prendre une photo (max 400 Ko)</p>
                  </button>
                )}
              </Field>
            </Section>

            <Section title="Commentaires" color="#94A3B8">
              <textarea value={f.commentaires} onChange={e => u('commentaires', e.target.value)}
                className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2.5 text-sm focus:border-[#E8611A] outline-none h-20 resize-none"
                placeholder="Observations supplémentaires..." />
            </Section>
          </div>
        )}
      </div>

      <div className="px-4 py-3 bg-white border-t border-[#CBD5E1]/20 flex items-center gap-2">
        {step > 1 && (
          <button onClick={() => setStep(step - 1)}
            className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#475569] hover:bg-[#F1F5F9] transition">
            ← Retour
          </button>
        )}
        <div className="flex-1" />
        {step < 4 ? (
          <button onClick={() => setStep(step + 1)}
            className="px-6 py-2.5 rounded-xl bg-[#E8611A] text-white text-xs font-bold shadow-sm hover:bg-[#D4550F] transition">
            Suivant →
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-[#0B7A3E] text-white text-xs font-bold shadow-sm hover:bg-[#096832] transition flex items-center gap-2 disabled:opacity-50">
            {submitting ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi...</>
            ) : (
              <><span className="material-symbols-outlined text-[16px]">send</span> Envoyer</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, color, children }) {
  return (
    <div className="bg-white rounded-xl border border-[#CBD5E1]/20 overflow-hidden">
      <div className="px-3 py-2 border-b border-[#CBD5E1]/10 flex items-center gap-2">
        <span className="w-1.5 h-4 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[11px] font-extrabold text-[#0D1B2A] uppercase tracking-wider">{title}</span>
      </div>
      <div className="p-3 space-y-3">
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}
