import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';

const STATUS_COLORS = { collected: '#E8611A', waiting: '#00796B', pending: '#CBD5E1' };
const STATUT_LABEL = { public: 'public', prive_laic: 'privé laïc', prive_confessionnel: 'privé confessionnel', communautaire_non_reconnue: 'communautaire non reconnu' };
const NIVEAU_LABEL = { primaire: 'primaire', secondaire: 'secondaire' };

export default function SchoolFiche({ school, onBack, geoData }) {
  const [schoolPhoto, setSchoolPhoto] = useState(school.photo_url || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const photoFileRef = useRef(null);

  useEffect(() => {
    setSchoolPhoto(school.photo_url || null);
  }, [school.id]);

  const total = (school.nombre_filles || 0) + (school.nombre_garcons || 0);
  const pctFilles = total > 0 ? Math.round((school.nombre_filles || 0) / total * 100) : 0;
  const inventaire = (() => { try { return typeof school.inventaire_classes === 'string' ? JSON.parse(school.inventaire_classes) : (school.inventaire_classes || []); } catch { return []; } })();
  const nbNiveaux = inventaire.length > 0 ? new Set(inventaire.map(c => c.classe?.split(' ')[0])).size : 0;
  const besoins = inventaire.reduce((s, c) => s + (c.besoin_bancs || 0), 0);

  const findZoneName = (geoKey, code) => {
    if (!geoData || !geoData[geoKey] || !code) return null;
    const f = geoData[geoKey].features.find(f => f.properties.code === code);
    return f?.properties?.name || null;
  };
  const spName = findZoneName('sp', school.commune_code);
  const deptName = findZoneName('depts', school.departement_code);
  const regName = findZoneName('regions', school.region_code);

  const isUrbain = school.milieu_implantation === 'urbain';
  const statutLabel = STATUT_LABEL[school.statut] || school.statut || 'inconnu';
  const niveauLabel = NIVEAU_LABEL[school.niveau_enseignement] || school.niveau_enseignement || '';

  let confessionText = '';
  if (school.statut === 'prive_confessionnel') {
    const conf = school.type_genre || school.categorie || '';
    confessionText = conf ? ` de confession ${conf}` : '';
  }

  let localisation = '';
  if (isUrbain) {
    localisation = `dans la commune de ${spName || school.commune_code || 'inconnue'}`;
  } else {
    localisation = `dans la communauté de ${spName || school.commune_code || 'inconnue'}`;
  }

  const directorTitle = school.directeur_genre === 'Mme' ? 'Madame' : school.directeur_genre === 'Mlle' ? 'Mademoiselle' : 'Monsieur';
  const hasDirector = school.directeur_nom;

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !school.id) return;
    setUploadingPhoto(true);
    setPhotoError(null);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const token = useAuthStore.getState().token;
      const res = await fetch(`${api.baseUrl}/ecoles/${school.id}/photo`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      }).then(async r => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.details || body.error || `Erreur HTTP ${r.status}`);
        return body;
      });
      if (res.error) throw new Error(res.details || res.error);
      if (res.photo_url) {
        setSchoolPhoto(res.photo_url);
        school.photo_url = res.photo_url;
        api.clearCache('/ecoles');
      }
    } catch (err) {
      console.error('Photo upload error:', err);
      setPhotoError(err.message || 'Échec de l\'envoi');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const description = `L'école ${school.nom_etablissement || 'inconnue'} est une école ${niveauLabel} ${statutLabel}${confessionText}. Elle se situe ${localisation}${deptName ? `, dans le département de ${deptName}` : ''}${regName ? `, dans la région de ${regName}` : ''}${school.annee_creation ? `. Créée en ${school.annee_creation}` : ''}${nbNiveaux > 0 ? `. Elle dispose de ${nbNiveaux} niveau${nbNiveaux > 1 ? 'x' : ''}` : ''}${school.enseignants_presents ? ` ainsi que de ${school.enseignants_presents} enseignant${school.enseignants_presents > 1 ? 's' : ''}` : ''}${hasDirector ? `. Et est dirigée par ${directorTitle} ${school.directeur_nom}` : ''}.`;

  return (
    <div className="flex flex-col gap-3 pb-4">
      {schoolPhoto ? (
        <div className="rounded-xl overflow-hidden shadow-sm border border-[#CBD5E1]/10 relative group">
          <img src={schoolPhoto} alt={school.nom_etablissement} className="w-full h-48 object-cover" />
          <button onClick={() => photoFileRef.current?.click()}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="material-symbols-outlined text-white text-[16px]">edit</span>
          </button>
          <input ref={photoFileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
        </div>
      ) : (
        <button onClick={() => photoFileRef.current?.click()}
          className="rounded-xl border-2 border-dashed border-[#CBD5E1] bg-white p-6 flex flex-col items-center gap-2 hover:border-[#E8611A]/40 hover:bg-[#E8611A]/5 transition-all">
          <span className="material-symbols-outlined text-[#CBD5E1] text-[32px]">{uploadingPhoto ? 'hourglass_top' : 'add_a_photo'}</span>
          <p className="text-[11px] text-[#94A3B8] font-medium">{uploadingPhoto ? 'Envoi en cours...' : 'Ajouter une photo de l\'établissement'}</p>
          {photoError && <p className="text-[11px] text-[#ba1a1a] font-medium">{photoError}</p>}
          <input ref={photoFileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
        </button>
      )}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#CBD5E1]/10">
        <div className="flex items-center justify-between mb-3">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ backgroundColor: `${STATUS_COLORS[school.collect_status] || '#CBD5E1'}10`, color: STATUS_COLORS[school.collect_status] || '#CBD5E1' }}>
            {school.collect_status === 'collected' ? 'Collecté' : school.collect_status === 'waiting' ? 'En cours' : 'En attente'}
          </span>
          <span className="text-[10px] text-[#94A3B8] font-mono">{school.code_mena}</span>
        </div>
        <h3 className="text-[15px] font-extrabold text-[#0D1B2A] leading-tight mb-3">{school.nom_etablissement}</h3>
        <p className="text-[12px] text-[#475569] leading-relaxed">{description}</p>
      </div>

      {total > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#CBD5E1]/10">
          <h4 className="text-[11px] font-bold text-[#0D1B2A] uppercase tracking-wider mb-3">Effectifs</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-2xl font-extrabold text-[#0D1B2A]">{total.toLocaleString('fr-FR')}</p>
              <p className="text-[9px] font-bold text-[#94A3B8] uppercase">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-extrabold text-[#E8611A]">{(school.nombre_filles || 0).toLocaleString('fr-FR')}</p>
              <p className="text-[9px] font-bold text-[#E8611A] uppercase">Filles {pctFilles}%</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-extrabold text-[#00796B]">{(school.nombre_garcons || 0).toLocaleString('fr-FR')}</p>
              <p className="text-[9px] font-bold text-[#00796B] uppercase">Garçons {100 - pctFilles}%</p>
            </div>
          </div>
          <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden flex mt-3">
            <div className="h-full bg-[#E8611A] rounded-l-full transition-all" style={{ width: `${pctFilles}%` }} />
            <div className="h-full bg-[#00796B] rounded-r-full flex-1" />
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] font-bold">
            <span className="text-[#94A3B8]">{school.enseignants_presents || 0} enseignants · {school.salles_classe_total || 0} salles</span>
            {total > 0 && school.enseignants_presents > 0 && <span className="text-[#475569]">Ratio {Math.round(total / school.enseignants_presents)}:1</span>}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#CBD5E1]/10">
        <h4 className="text-[11px] font-bold text-[#0D1B2A] uppercase tracking-wider mb-3">Infrastructure</h4>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Eau potable', ok: school.eau_potable, icon: 'water_drop' },
            { label: 'Électricité', ok: school.electricite, icon: 'bolt' },
            { label: 'Toilettes filles', ok: school.toilettes_filles_fonctionnelles, icon: 'wc' },
            { label: 'Bancs', ok: besoins === 0, icon: 'chair', extra: besoins > 0 ? `${besoins} besoins` : 'OK' },
          ].map(item => (
            <div key={item.label} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-bold ${item.ok ? 'bg-[#00796B]/8 text-[#00796B]' : 'bg-[#ba1a1a]/8 text-[#ba1a1a]'}`}>
              <span className="material-symbols-outlined text-[14px]">{item.icon}</span>
              <span>{item.label}</span>
              {item.extra && <span className="ml-auto text-[9px]">{item.extra}</span>}
            </div>
          ))}
        </div>
        {school.materiaux_precaires && school.materiaux_precaires.length > 0 && (
          <div className="mt-2 px-2.5 py-2 rounded-lg bg-[#d97706]/8 text-[#d97706] text-[11px] font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]">construction</span>
            <span>Matériaux précaires : {Array.isArray(school.materiaux_precaires) ? school.materiaux_precaires.join(', ') : school.materiaux_precaires}</span>
          </div>
        )}
      </div>

      {inventaire.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#CBD5E1]/10">
          <h4 className="text-[11px] font-bold text-[#0D1B2A] uppercase tracking-wider mb-3">Inventaire des classes</h4>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center text-[10px] font-bold text-[#94A3B8] uppercase px-2">
              <span className="flex-1">Classe</span>
              <span className="w-10 text-center">F</span>
              <span className="w-10 text-center">G</span>
              <span className="w-10 text-center">Bancs</span>
              <span className="w-14 text-center">Besoin</span>
            </div>
            {inventaire.map((cl, i) => (
              <div key={i} className="flex items-center text-[11px] font-medium text-[#0D1B2A] px-2 py-1.5 rounded-lg bg-[#F8F6F1]">
                <span className="flex-1 font-bold">{cl.classe}</span>
                <span className="w-10 text-center text-[#E8611A]">{cl.filles || 0}</span>
                <span className="w-10 text-center text-[#00796B]">{cl.garcons || 0}</span>
                <span className="w-10 text-center">{cl.bancs_actifs || 0}</span>
                <span className="w-14 text-center font-bold text-[#ba1a1a]">{cl.besoin_bancs || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {school.last_collecte_at && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#CBD5E1]/10">
          <h4 className="text-[11px] font-bold text-[#0D1B2A] uppercase tracking-wider mb-2">Dernière collecte</h4>
          <p className="text-[12px] font-medium text-[#475569]">
            {new Date(school.last_collecte_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      )}
    </div>
  );
}
