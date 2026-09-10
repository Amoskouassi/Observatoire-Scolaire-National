import { useState } from 'react';

export default function Collecte() {
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ code: '', nom: '', classe: '', f: '', g: '', bancs: '', comm: '' });
  const u = (k, v) => setF((p) => ({ ...p, [k]: v }));

  return (
    <div className="h-full overflow-auto bg-[#F4EFE6]">
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-5">
        <div>
          <h1 className="text-lg font-bold text-[#0D1B2A]">Collecte Terrain</h1>
          <p className="text-xs text-[#6B7280] mt-1">Formulaire intelligent — fonctionne hors-ligne</p>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => <div key={s} className={`flex-1 h-1.5 rounded-full ${step >= s ? 'bg-[#E8611A]' : 'bg-[#dee8ff]'}`} />)}
        </div>

        {step === 1 && (
          <div className="space-y-4 animate-fade-in-up">
            <h3 className="text-xs font-bold text-[#6B7280] uppercase">Identification</h3>
            <div>
              <label className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Code MENA</label>
              <input value={f.code} onChange={(e) => u('code', e.target.value)} className="w-full bg-[#dee8ff]/60 border border-[#CBD5E1] rounded-lg p-2.5 text-sm focus:border-[#E8611A] outline-none" placeholder="PRIM-001234" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Nom</label>
              <input value={f.nom} onChange={(e) => u('nom', e.target.value)} className="w-full bg-[#dee8ff]/60 border border-[#CBD5E1] rounded-lg p-2.5 text-sm focus:border-[#E8611A] outline-none" placeholder="École Primaire" />
            </div>
            <button onClick={() => setStep(2)} className="btn-primary w-full">Suivant →</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in-up">
            <h3 className="text-xs font-bold text-[#6B7280] uppercase">Inventaire</h3>
            <div>
              <label className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Classe</label>
              <input value={f.classe} onChange={(e) => u('classe', e.target.value)} className="w-full bg-[#dee8ff]/60 border border-[#CBD5E1] rounded-lg p-2.5 text-sm focus:border-[#E8611A] outline-none" placeholder="CP1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-bold text-[#6B7280] uppercase block mb-1">👧 Filles</label><input type="number" value={f.f} onChange={(e) => u('f', e.target.value)} className="w-full bg-[#dee8ff]/60 border border-[#CBD5E1] rounded-lg p-2.5 text-sm focus:border-[#E8611A] outline-none" min="0" /></div>
              <div><label className="text-xs font-bold text-[#6B7280] uppercase block mb-1">👦 Garçons</label><input type="number" value={f.g} onChange={(e) => u('g', e.target.value)} className="w-full bg-[#dee8ff]/60 border border-[#CBD5E1] rounded-lg p-2.5 text-sm focus:border-[#E8611A] outline-none" min="0" /></div>
            </div>
            <div>
              <label className="text-xs font-bold text-[#6B7280] uppercase block mb-1">🪑 Bancs</label>
              <input type="number" value={f.bancs} onChange={(e) => u('bancs', e.target.value)} className="w-full bg-[#dee8ff]/60 border border-[#CBD5E1] rounded-lg p-2.5 text-sm focus:border-[#E8611A] outline-none" min="0" />
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="btn-ghost">← Retour</button>
              <button onClick={() => setStep(3)} className="btn-primary">Suivant →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in-up">
            <h3 className="text-xs font-bold text-[#6B7280] uppercase">Photos</h3>
            <div className="border-2 border-dashed border-[#CBD5E1] rounded-xl p-8 text-center">
              <span className="material-symbols-outlined text-[#E8611A] text-[40px]">add_a_photo</span>
              <p className="text-xs text-[#6B7280] mt-2">Ajouter une photo</p>
            </div>
            <div>
              <label className="text-xs font-bold text-[#6B7280] uppercase block mb-1">Commentaires</label>
              <textarea value={f.comm} onChange={(e) => u('comm', e.target.value)} className="w-full bg-[#dee8ff]/60 border border-[#CBD5E1] rounded-lg p-2.5 text-sm focus:border-[#E8611A] outline-none h-24 resize-none" placeholder="Observations..." />
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="btn-ghost">← Retour</button>
              <button className="btn-secondary flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">send</span> Envoyer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
