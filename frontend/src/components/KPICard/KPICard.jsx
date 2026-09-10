export default function KPICard({ label, value, color = '#1E293B' }) {
  return (
    <div className="kpi-card">
      <span className="text-xs font-bold text-[#6B7280]">{label}</span>
      <span className="text-[1.875rem] font-black tabular-nums mt-1" style={{ color }}>{value}</span>
    </div>
  );
}
