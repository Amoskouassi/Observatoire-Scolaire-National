import { useEffect, useState } from 'react';

export default function JaugeParite({ filles, garcons, total }) {
  const [width, setWidth] = useState(0);
  const pourcentage = total > 0 ? Math.round((filles / total) * 100) : 0;

  useEffect(() => {
    const timer = setTimeout(() => setWidth(pourcentage), 100);
    return () => clearTimeout(timer);
  }, [pourcentage]);

  return (
    <div className="bg-gray-50 p-4 rounded-card border border-gray-100">
      <div className="flex justify-between text-[11px] font-bold uppercase mb-2">
        <span className="text-akwa-rose">👧 Filles ({pourcentage}%)</span>
        <span className="text-akwa-bleu">👦 Garçons ({100 - pourcentage}%)</span>
      </div>
      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden flex">
        <div
          className="bg-akwa-rose h-full transition-all duration-700 ease-out"
          style={{ width: `${width}%` }}
        />
        <div className="bg-akwa-bleu h-full flex-1" />
      </div>
      <p className="text-[10px] text-gray-400 mt-1.5 text-center">
        Indice de Parité : {(filles / Math.max(garcons, 1)).toFixed(2)} (1.0 = parité parfaite)
      </p>
    </div>
  );
}
