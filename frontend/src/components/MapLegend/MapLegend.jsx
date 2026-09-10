import { useMapStore } from '../../stores/mapStore';

export default function MapLegend() {
  return (
    <div className="absolute bottom-5 left-5 z-20 animate-fade-in-up">
      <div className="bg-white/95 backdrop-blur-sm rounded-card border border-akwa-frontiere shadow-card p-3">
        <h3 className="text-[10px] text-gray-400 font-black uppercase mb-2">Légende</h3>

        <div className="space-y-1.5">
          <LegendItem color="#E8611A" label="Collecté" />
          <LegendItem color="#0B7A3E" label="En attente" />
          <LegendItem color="#CBD5E1" label="Non programmé" />
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100">
          <span className="text-[10px] text-gray-400 font-bold uppercase block mb-2">Taille école</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-akwa-orange" />
              <span className="text-[10px] text-gray-500">1-99</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-akwa-orange" />
              <span className="text-[10px] text-gray-500">100-499</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-akwa-orange" />
              <span className="text-[10px] text-gray-500">500+</span>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100">
          <button className="btn-ghost text-[10px] w-full">
            📖 Comment lire cette carte ?
          </button>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
      <span className="text-[11px] font-bold text-akwa-texte">{label}</span>
    </div>
  );
}
