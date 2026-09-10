import KPICard from '../KPICard/KPICard';
import JaugeParite from '../JaugeParite/JaugeParite';

export default function SidebarContent({ content }) {
  if (!content) return null;

  const { type, data, status, name, level } = content;

  const statusConfig = {
    collected: { label: 'Données collectées', color: 'orange' },
    waiting:   { label: 'En attente de collecte', color: 'vert' },
    pending:   { label: 'Non programmé', color: 'gris' },
  };

  const st = statusConfig[status] || statusConfig.pending;

  return (
    <div className="flex-1 flex flex-col">
      {/* Badge statut */}
      <div className="mb-4 pb-3 border-b border-gray-100">
        <span className={`badge-${st.color}`}>{st.label}</span>
        <h2 className="text-lg font-black text-akwa-texte mt-1">{name}</h2>
        <p className="text-xs text-gray-500 mt-0.5 capitalize">Niveau : {level}</p>
      </div>

      {/* Contenu selon le type */}
      {type === 'admin-zone' && (
        <AdminZoneContent data={data} status={status} />
      )}

      {type === 'school' && (
        <SchoolContent data={data} />
      )}
    </div>
  );
}

function AdminZoneContent({ data, status }) {
  if (status === 'pending' || status === 'waiting') {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="mx-auto mb-3 text-gray-300" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        <p className="font-medium">{status === 'waiting' ? 'Zone en attente de collecte' : 'Zone non programmée'}</p>
        <p className="text-xs mt-1">Cliquez sur une zone collectée (orange) pour voir les statistiques.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <KPICard label="Écoles" value={data?.schools || 0} color="akwa-orange" />
        <KPICard label="Élèves" value={data?.students?.toLocaleString() || '0'} color="akwa-texte" />
      </div>

      <JaugeParite
        filles={data?.girls || 0}
        garcons={data?.boys || 0}
        total={data?.students || 0}
      />

      <button className="btn-primary w-full">
        🔑 Accéder à l'Espace Décideur
      </button>
    </div>
  );
}

function SchoolContent({ data }) {
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Photo */}
      {data.photo_url && (
        <img
          src={data.photo_url}
          alt={data.nom_etablissement}
          className="w-full h-48 object-cover rounded-card"
        />
      )}

      {/* Badges */}
      <div className="flex gap-2 flex-wrap">
        <span className="badge-orange">{data.statut}</span>
        <span className="badge-gris">{data.niveau_enseignement}</span>
        {data.milieu_implantation === 'rural' && (
          <span className="badge-vert"> rural</span>
        )}
      </div>

      {/* Nom */}
      <h2 className="text-xl font-black text-akwa-texte">{data.nom_etablissement}</h2>
      <p className="text-xs text-gray-500">Code : {data.code_mena} | Créée en {data.annee_creation}</p>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <KPICard label="Filles" value={data.nombre_filles} color="akwa-rose" />
        <KPICard label="Garçons" value={data.nombre_garcons} color="akwa-bleu" />
        <KPICard label="Enseignants" value={data.enseignants_presents} color="akwa-texte" />
        <KPICard label="Salles" value={data.salles_classe_total} color="akwa-texte" />
      </div>

      {/* Jauge parité */}
      <JaugeParite
        filles={data.nombre_filles}
        garcons={data.nombre_garcons}
        total={data.nombre_filles + data.nombre_garcons}
      />

      {/* Inventaire par classe */}
      {data.inventaire_classes && data.inventaire_classes.length > 0 && (
        <div>
          <h3 className="text-xs font-black text-gray-400 uppercase mb-2">Inventaire par classe</h3>
          <div className="space-y-1">
            {data.inventaire_classes.map((classe, i) => (
              <div key={i} className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded-lg">
                <span className="font-bold text-akwa-texte">{classe.classe}</span>
                <span className="text-gray-500">👧 {classe.filles} | 👦 {classe.garcons} | 🪑 {classe.bancs_actifs}</span>
                <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                  classe.besoin_bancs > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                }`}>
                  {classe.besoin_bancs > 0 ? `+${classe.besoin_bancs}` : 'OK'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bouton viral */}
      <button className="btn-secondary w-full text-[10px] py-2">
        📄 Générer l'affiche de plaidoyer
      </button>
    </div>
  );
}
