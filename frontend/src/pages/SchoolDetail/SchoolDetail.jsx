import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import KPICard from '../../components/KPICard/KPICard';
import JaugeParite from '../../components/JaugeParite/JaugeParite';

export default function SchoolDetail() {
  const { id } = useParams();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSchool(id)
      .then(setSchool)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSkeleton />;
  if (!school) return <NotFound />;

  return (
    <div className="h-full overflow-auto bg-akwa-beige">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Link to="/explorer" className="text-akwa-orange hover:underline text-xs font-bold">
          ← Retour à la carte
        </Link>

        {/* Photo */}
        {school.photo_url && (
          <img src={school.photo_url} alt={school.nom_etablissement}
               className="w-full h-64 object-cover rounded-card mt-4" />
        )}

        {/* Badges */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <span className="badge-orange">{school.statut}</span>
          <span className="badge-gris">{school.niveau_enseignement}</span>
          <span className="badge-vert">{school.milieu_implantation}</span>
          <span className={`badge ${school.collect_status === 'collected' ? 'badge-orange' : school.collect_status === 'waiting' ? 'badge-vert' : 'badge-gris'}`}>
            {school.collect_status === 'collected' ? '🟡 Collecté' : school.collect_status === 'waiting' ? '🟢 En attente' : '⚪ Non programmé'}
          </span>
        </div>

        <h1 className="text-2xl font-black text-akwa-texte mt-3">{school.nom_etablissement}</h1>
        <p className="text-sm text-gray-500 mt-1">Code MENA : {school.code_mena} | Créée en {school.annee_creation || 'N/A'}</p>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <KPICard label="Filles" value={school.nombre_filles} color="akwa-rose" />
          <KPICard label="Garçons" value={school.nombre_garcons} color="akwa-bleu" />
          <KPICard label="Enseignants" value={school.enseignants_presents} color="akwa-texte" />
          <KPICard label="Salles" value={school.salles_classe_total} color="akwa-texte" />
        </div>

        {/* Parité */}
        <div className="mt-6">
          <JaugeParite filles={school.nombre_filles} garcons={school.nombre_garcons}
                       total={school.nombre_filles + school.nombre_garcons} />
        </div>

        {/* Inventaire par classe */}
        {school.inventaire_classes?.length > 0 && (
          <div className="mt-6 card">
            <h3 className="text-xs font-black text-gray-400 uppercase mb-3">Inventaire par classe</h3>
            <div className="space-y-2">
              {school.inventaire_classes.map((c, i) => (
                <div key={i} className="flex justify-between items-center text-xs bg-gray-50 p-3 rounded-lg">
                  <span className="font-bold text-akwa-texte">{c.classe}</span>
                  <span className="text-gray-500">👧 {c.filles} | 👦 {c.garcons} | 🪑 {c.bancs_actifs}</span>
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${c.besoin_bancs > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {c.besoin_bancs > 0 ? `+${c.besoin_bancs} bancs` : 'OK'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Infrastructures */}
        <div className="mt-6 card">
          <h3 className="text-xs font-black text-gray-400 uppercase mb-3">Infrastructures</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <InfraItem label="Toilettes fonctionnelles" ok={school.toilettes_filles_fonctionnelles} />
            <InfraItem label="Eau potable" ok={school.eau_potable} />
            <InfraItem label="Électricité" ok={school.electricite} />
            <InfraItem label="Matériaux précaires" ok={!school.materiaux_precaires?.length} />
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 flex gap-3">
          <button className="btn-primary flex-1">📄 Affiche plaidoyer</button>
          <button className="btn-secondary flex-1">✏️ Signaler une erreur</button>
        </div>
      </div>
    </div>
  );
}

function InfraItem({ label, ok }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
      <span className={ok ? 'text-akwa-vert' : 'text-akwa-rouge'}>{ok ? '✅' : '❌'}</span>
      <span className="font-medium text-akwa-texte">{label}</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="h-full overflow-auto bg-akwa-beige">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="skeleton h-4 w-32 mb-4" />
        <div className="skeleton h-64 w-full rounded-card" />
        <div className="skeleton h-8 w-3/4 mt-4" />
        <div className="grid grid-cols-4 gap-3 mt-6">
          {[1,2,3,4].map((i) => <div key={i} className="skeleton h-20 rounded-card" />)}
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="h-full flex items-center justify-center bg-akwa-beige">
      <div className="text-center">
        <p className="text-4xl mb-4">🏫</p>
        <h2 className="text-lg font-black text-akwa-texte">École non trouvée</h2>
        <Link to="/explorer" className="text-akwa-orange hover:underline text-sm font-bold mt-2 block">
          Retour à la carte
        </Link>
      </div>
    </div>
  );
}
