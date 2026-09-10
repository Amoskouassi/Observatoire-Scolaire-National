export default function LoadingScreen() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-5 bg-[#F4EFE6]">
      <div className="w-16 h-16 rounded-full border-4 border-[#E8611A]/20 border-t-[#E8611A] animate-spin" />
      <div className="text-center">
        <h2 className="text-xs font-bold text-[#0D1B2A] uppercase tracking-widest">Observatoire National</h2>
        <p className="text-xs text-[#6B7280] mt-1">Chargement...</p>
      </div>
    </div>
  );
}
