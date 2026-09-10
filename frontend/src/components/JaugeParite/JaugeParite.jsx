import { useEffect, useState } from 'react';

export default function JaugeParite({ filles, garcons, total }) {
  const [width, setWidth] = useState(0);
  const pourcentage = total > 0 ? Math.round((filles / total) * 100) : 0;

  useEffect(() => {
    const timer = setTimeout(() => setWidth(pourcentage), 100);
    return () => clearTimeout(timer);
  }, [pourcentage]);

  return (
    <div className="bg-ivoire-beige/70 rounded-xl p-3 shadow-sm">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-label-sm text-ivoire-texte flex items-center gap-1">
          <span className="material-symbols-outlined text-[15px] text-ivoire-orange">pie_chart</span>
          Parité Filles / Garçons
        </span>
        <span className="text-[10px] text-ivoire-gris">IPG: {(garcons / Math.max(filles, 1)).toFixed(2)}</span>
      </div>
      <div className="w-full h-3 bg-ivoire-blanc rounded-full overflow-hidden flex p-0.5 shadow-inner">
        <div className="h-full bg-ivoire-orange rounded-l-full transition-all duration-700 ease-out" style={{ width: `${width}%` }} />
        <div className="h-full bg-ivoire-vert rounded-r-full flex-1" />
      </div>
      <div className="flex justify-between items-center mt-1.5 text-label-sm">
        <span className="text-ivoire-orange font-bold flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-ivoire-orange" />
          Filles {pourcentage}%
        </span>
        <span className="text-ivoire-vert font-bold flex items-center gap-1">
          Garçons {100 - pourcentage}%
          <span className="w-2 h-2 rounded-full bg-ivoire-vert" />
        </span>
      </div>
    </div>
  );
}
