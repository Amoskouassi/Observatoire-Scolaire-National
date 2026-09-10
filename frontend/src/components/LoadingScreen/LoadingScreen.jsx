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
    <div className="absolute inset-0 z-50 bg-surface flex flex-col items-center justify-center gap-5">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-ivoire-orange/20 border-t-ivoire-orange animate-spin" />
        <span className="absolute inset-0 flex items-center justify-center text-2xl">🇨🇮</span>
      </div>
      <div className="text-center">
        <h2 className="text-label-sm text-ivoire-nuit uppercase tracking-widest font-bold">
          Observatoire Scolaire National
        </h2>
        <p className="text-body-sm text-ivoire-gris mt-1">Chargement de la carte{dots}</p>
      </div>
    </div>
  );
}
