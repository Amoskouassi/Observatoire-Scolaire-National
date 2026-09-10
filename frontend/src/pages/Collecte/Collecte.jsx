import { useState } from 'react';

export default function Collecte() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    code_mena: '', nom_ecole: '', classe: '', filles: '', garcons: '', bancs_actifs: '', commentaires: '',
  });

  const update = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="h-full overflow-auto bg-surface">
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-5">
        <div>
          <h1 className="text-headline-sm text-ivoire-nuit font-black">Collecte Terrain</h1>
          <p className="text-body-sm text-ivoire-gris mt-1">Formulaire intelligent — fonctionne hors-ligne</p>
        </div>

        {/* Progress */}
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${step >= s ? 'bg-ivoire-orange' : 'bg-surface-container-high'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4 animate-fade-in-up">
            <h3 className="text-label-sm text-ivoire-gris uppercase tracking-wider">Identification de l'école</h3>
            <div>
              <label className="text-label-sm text-ivoire-gris uppercase block mb-1">Code MENA</label>
              <input type="text" value={formData.code_mena} onChange={(e) => update('code_mena', e.target.value)}
                     className="w-full bg-surface-container-high/60 border border-ivoire-frontiere rounded-lg p-2.5 text-body-sm focus:border-ivoire-orange outline-none transition-colors" placeholder="PRIM-001234" />
            </div>
            <div>
              <label className="text-label-sm text-ivoire-gris uppercase block mb-1">Nom de l'école</label>
              <input type="text" value={formData.nom_ecole} onChange={(e) => update('nom_ecole', e.target.value)}
                     className="w-full bg-surface-container-high/60 border border-ivoire-frontiere rounded-lg p-2.5 text-body-sm focus:border-ivoire-orange outline-none transition-colors" placeholder="École Primaire de Korhogo" />
            </div>
            <button onClick={() => setStep(2)} className="btn-primary w-full">Suivant →</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in-up">
            <h3 className="text-label-sm text-ivoire-gris uppercase tracking-wider">Inventaire par classe</h3>
            <div>
              <label className="text-label-sm text-ivoire-gris uppercase block mb-1">Classe</label>
              <input type="text" value={formData.classe} onChange={(e) => update('classe', e.target.value)}
                     className="w-full bg-surface-container-high/60 border border-ivoire-frontiere rounded-lg p-2.5 text-body-sm focus:border-ivoire-orange outline-none transition-colors" placeholder="CP1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-label-sm text-ivoire-gris uppercase block mb-1">👧 Filles</label>
                <input type="number" value={formData.filles} onChange={(e) => update('filles', e.target.value)}
                       className="w-full bg-surface-container-high/60 border border-ivoire-frontiere rounded-lg p-2.5 text-body-sm focus:border-ivoire-orange outline-none transition-colors" min="0" />
              </div>
              <div>
                <label className="text-label-sm text-ivoire-gris uppercase block mb-1">👦 Garçons</label>
                <input type="number" value={formData.garcons} onChange={(e) => update('garcons', e.target.value)}
                       className="w-full bg-surface-container-high/60 border border-ivoire-frontiere rounded-lg p-2.5 text-body-sm focus:border-ivoire-orange outline-none transition-colors" min="0" />
              </div>
            </div>
            <div>
              <label className="text-label-sm text-ivoire-gris uppercase block mb-1">🪑 Bancs actifs</label>
              <input type="number" value={formData.bancs_actifs} onChange={(e) => update('bancs_actifs', e.target.value)}
                     className="w-full bg-surface-container-high/60 border border-ivoire-frontiere rounded-lg p-2.5 text-body-sm focus:border-ivoire-orange outline-none transition-colors" min="0" />
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="btn-ghost">← Retour</button>
              <button onClick={() => setStep(3)} className="btn-primary">Suivant →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in-up">
            <h3 className="text-label-sm text-ivoire-gris uppercase tracking-wider">Photos & Commentaires</h3>
            <div className="border-2 border-dashed border-ivoire-frontiere rounded-xl p-8 text-center">
              <span className="material-symbols-outlined text-ivoire-orange text-[40px]">add_a_photo</span>
              <p className="text-body-sm text-ivoire-gris mt-2">Appuyez pour ajouter une photo</p>
              <p className="text-[10px] text-ivoire-gris mt-1">Max 5 photos · JPEG/PNG · &lt;5 Mo</p>
            </div>
            <div>
              <label className="text-label-sm text-ivoire-gris uppercase block mb-1">Commentaires</label>
              <textarea value={formData.commentaires} onChange={(e) => update('commentaires', e.target.value)}
                        className="w-full bg-surface-container-high/60 border border-ivoire-frontiere rounded-lg p-2.5 text-body-sm focus:border-ivoire-orange outline-none transition-colors h-24 resize-none" placeholder="Observations terrain..." />
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="btn-ghost">← Retour</button>
              <button className="btn-secondary flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">send</span>
                Envoyer la collecte
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
