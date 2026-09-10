export default function MapLegend() {
  return (
    <div className="absolute bottom-5 left-5 right-5 z-20 animate-fade-in-up pointer-events-none">
      <div className="bg-ivoire-nuit/90 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center justify-between text-ivoire-blanc text-label-sm text-[10px] shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-ivoire-orange" />
            <span>Collecté</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-ivoire-vert" />
            <span>En cours</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-ivoire-gris" />
            <span>En attente</span>
          </div>
        </div>
        <span className="text-[9px] text-ivoire-orange font-bold uppercase tracking-wider">SIG v2.4</span>
      </div>
    </div>
  );
}
