export default function JaugeParite({ filles, garcons }) {
  const total = filles + garcons;
  const pctF = total > 0 ? Math.round((filles / total) * 100) : 0;
  return (
    <div className="bg-[#F4EFE6] rounded-xl p-3">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="font-bold text-[#1E293B]">Parité</span>
        <span className="text-[#6B7280]">IPG: {(garcons / Math.max(filles, 1)).toFixed(2)}</span>
      </div>
      <div className="w-full h-3 bg-white rounded-full overflow-hidden flex p-0.5">
        <div className="h-full bg-[#E8611A] rounded-l-full" style={{ width: `${pctF}%` }} />
        <div className="h-full bg-[#0B7A3E] rounded-r-full flex-1" />
      </div>
      <div className="flex justify-between text-xs font-bold mt-1.5">
        <span className="text-[#E8611A]">Filles {pctF}%</span>
        <span className="text-[#0B7A3E]">Garçons {100 - pctF}%</span>
      </div>
    </div>
  );
}
