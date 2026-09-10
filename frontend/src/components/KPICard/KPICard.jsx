export default function KPICard({ label, value, icon, color = 'akwa-texte', trend }) {
  return (
    <div className="kpi-card">
      <span className="text-[10px] text-gray-400 font-bold uppercase block">{label}</span>
      <div className="flex items-end gap-1.5">
        <span className={`text-xl font-black ${color}`}>{value}</span>
        {trend !== undefined && (
          <span className={`text-[10px] font-bold mb-0.5 ${trend >= 0 ? 'text-akwa-vert' : 'text-akwa-rouge'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}
