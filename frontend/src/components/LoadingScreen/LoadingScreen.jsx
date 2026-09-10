import { useEffect, useState } from 'react';

export default function LoadingScreen() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center gap-5 bg-akwa-beige">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-akwa-orange/20 border-t-akwa-orange animate-spin" />
        <span className="absolute inset-0 flex items-center justify-center text-2xl">🇨🇮</span>
      </div>

      <div className="text-center">
        <h2 className="text-sm font-black text-akwa-texte uppercase tracking-widest">
          Observatoire Scolaire National
        </h2>
        <p className="text-[11px] text-akwa-gris mt-1">
          Chargement de la carte{dots}
        </p>
      </div>
    </div>
  );
}
