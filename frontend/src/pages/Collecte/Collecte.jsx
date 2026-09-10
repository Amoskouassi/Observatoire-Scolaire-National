import { useState } from 'react';

export default function Collecte() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    code_mena: '',
    nom_ecole: '',
    classe: '',
    filles: '',
    garcons: '',
    bancs_actifs: '',
    commentaires: '',
  });

  const update = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="h-full overflow-auto bg-akwa-beige">
      <div className="max-w-lg mx-auto px-6 py-8">
        <h1 className="text-xl font-black text-akwa-texte">📱 Collecte Terrain</h1>
        <p className="text-sm text-gray-500 mt-1">Formulaire intelligent — fonctionne hors-ligne</p>

        {/* Progress */}
        <div className="flex gap-2 mt-6 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full ${step >= s ? 'bg-akwa-orange' : 'bg-gray-200'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4 animate-fade-in-up">
            <h3 className="text-xs font-black text-gray-400 uppercase">Identification de l'école</h3>

            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Code MENA</label>
              <input type="text" value={formData.code_mena} onChange={(e) => update('code_mena', e.target.value)}
                     className="filter-select" placeholder="Ex: PRIM-001234" />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Nom de l'école</label>
              <input type="text" value={formData.nom_ecole} onChange={(e) => update('nom_ecole', e.target.value)}
                     className="filter-select" placeholder="Ex: École Primaire de Korhogo" />
            </div>

            <div className="flex justify-end">
              <button onClick={() => setStep(2)} className="btn-primary">Suivant →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in-up">
            <h3 className="text-xs font-black text-gray-400 uppercase">Inventaire par classe</h3>

            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Classe</label>
              <input type="text" value={formData.classe} onChange={(e) => update('classe', e.target.value)}
                     className="filter-select" placeholder="Ex: CP1" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">👧 Filles</label>
                <input type="number" value={formData.filles} onChange={(e) => update('filles', e.target.value)}
                       className="filter-select" min="0" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">👦 Garçons</label>
                <input type="number" value={formData.garcons} onChange={(e) => update('garcons', e.target.value)}
                       className="filter-select" min="0" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">🪑 Bancs actifs</label>
              <input type="number" value={formData.bancs_actifs} onChange={(e) => update('bancs_actifs', e.target.value)}
                     className="filter-select" min="0" />
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="btn-ghost">← Retour</button>
              <button onClick={() => setStep(3)} className="btn-primary">Suivant →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in-up">
            <h3 className="text-xs font-black text-gray-400 uppercase">Photos & Commentaires</h3>

            <div className="border-2 border-dashed border-akwa-frontiere rounded-card p-8 text-center">
              <p className="text-3xl mb-2">📸</p>
              <p className="text-xs text-gray-500">Appuyez pour ajouter une photo</p>
              <p className="text-[10px] text-gray-400 mt-1">Max 5 photos • JPEG/PNG • &lt;5 Mo</p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Commentaires</label>
              <textarea value={formData.commentaires} onChange={(e) => update('commentaires', e.target.value)}
                        className="filter-select h-24 resize-none" placeholder="Observations terrain..." />
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="btn-ghost">← Retour</button>
              <button className="btn-secondary">📤 Envoyer la collecte</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
